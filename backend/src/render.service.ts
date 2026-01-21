import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LabEntity } from './entities/lab.entity';
import { SessionEntity } from './entities/session.entity';
import { ProjectsService } from './projects.service';
import { AnnouncementService } from './announcement.service';
import { ConfigService } from './config.service';
import { ClassService } from './class.service';
import { periodLabelOf, periodRange, semesterYear, weekNoOf, weekRange } from './time.utils';

type PeriodIndex = 1|2|3|4|5|6|7|8;

@Injectable()
export class RenderService {
  private cache = new Map<string, {at:number; data:any}>();
  constructor(
    @InjectRepository(LabEntity) private labsRepo: Repository<LabEntity>,
    @InjectRepository(SessionEntity) private sessRepo: Repository<SessionEntity>,
    private projects: ProjectsService,
    private banner: AnnouncementService,
    private config: ConfigService,
    private classService: ClassService
  ) {}

  private toISO(d: Date) {
    const y=d.getFullYear(), m=`${d.getMonth()+1}`.padStart(2,'0'), dd=`${d.getDate()}`.padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }
  private async isWorkday(d: Date): Promise<boolean> {
    const iso = this.toISO(d);
    const list = await this.config.listCalendarOverrides();
    const ov = list.find(x=>x.date===iso)?.type;
    if (ov==='work') return true;
    if (ov==='off') return false;
    const day = d.getDay(); return day>=1 && day<=5;
  }

  async buildRender(params: { date?: string; lab?: 'all'|number; scope?: 'week'|'semester'; showDone?: boolean; dataAnalysisConfig?: any }) {
    const labs = await this.labsRepo.find({ order: { id: 'ASC' } });
    const date = params.date ? new Date(params.date) : new Date();
    const dateISO = this.toISO(date);

    // banner
    const b = await this.banner.get();
    const banner = (() => {
      if (!b) return null;
      if (!b.content || b.content.trim() === '') return null; // 只检查内容是否为空
      if (b.expiresAt) {
        const exp = new Date(b.expiresAt);
        if (new Date() > exp) return null;
      }
      return { content: b.content, level: b.level, expiresAt: b.expiresAt, visible: true, scrollable: b.scrollable, scrollTime: b.scrollTime };
    })();

    // spotlight - 返回原始数据，状态由前端判断
    const prs = periodRange(date);
    const sessionsToday = await this.sessRepo.find({ where: { date: dateISO }});
    
    // 只使用用户设置的横幅，不自动生成默认横幅
    const finalBanner = banner;
    const spotlight = labs.map(lab=>{
      const day = sessionsToday.filter(s=>s.lab_id===lab.id).sort((a,b)=>a.period-b.period);
      
      // 返回今天所有课程（按节次排序），由前端筛选显示第一个非完成的课程
      if (day.length > 0) {
        const courses = day.map(s => {
          const pr = prs.find(x=>x.p===s.period)!;
          
          // 计算多课时的时间范围
          const duration = s.duration || 1;
          const endPeriod = s.period + duration - 1;
          const endPr = prs.find(x=>x.p===endPeriod);
          
          return { 
            id:s.id, 
            date: s.date, // 返回日期，供前端判断状态
            period: s.period, // 返回节次
            duration: duration, // 返回持续时间
            time: `${pr.start}-${endPr?.end || pr.end}`, 
            course:s.course, 
            teacher:s.teacher, 
            content:s.content ?? undefined,
            planned:s.planned, 
            capacity:s.capacity, 
            full: s.planned>=s.capacity 
          };
        });
        
        return { 
          lab_id:lab.id, 
          lab:lab.name, 
          capacity:lab.capacity,
          spotlight: courses
        };
      }
      
      return { lab_id:lab.id, lab:lab.name, capacity:lab.capacity, spotlight: null };
    });

    // KPI
    const semesterStartISO = await this.config.getSemesterStartMondayISO();
    const start = new Date(semesterStartISO);
    const { sunday: endOfThisWeek } = weekRange(date < start ? start : date);
    const inRange = (iso: string) => {
      const d=new Date(iso);
      return d>=start && d<=endOfThisWeek;
    };
    const rowsInRange = await this.sessRepo.find({ where: { date: Between(this.toISO(start), this.toISO(endOfThisWeek)) }});
    const courseTotals = rowsInRange.length;
    const attendance = rowsInRange.reduce((a,s)=>a+s.planned, 0);

    // 计算工作日数量（周1-5，不包括周末，但包括调休）
    let workdays = 0;
    for (let d=new Date(start); d<=endOfThisWeek; d.setDate(d.getDate()+1)) {
      if (await this.isWorkday(new Date(d))) workdays++;
    }
    // 分母：工作日数量 * 8节课 * 实验室数量
    const denom = workdays * 8 * labs.length || 1;
    const utilization = Number((courseTotals/denom).toFixed(4));

    // 扩展KPI数据
    const currentYear = semesterYear(start);
    const allProjects = await this.projects.listByYearSorted(currentYear);
    const projectCount = allProjects.length;
    const participantCount = allProjects.reduce((sum, p) => sum + p.member_count, 0);
    const labCount = labs.length;
    
    // 计算活跃实验室数量（有课程安排的实验室）
    const activeLabIds = new Set(rowsInRange.map(s => s.lab_id));
    const activeLabs = activeLabIds.size;
    
    // 计算项目完成率
    const completedProjects = allProjects.filter(p => p.status === 'done').length;
    const completionRate = projectCount > 0 ? completedProjects / projectCount : 0;

    // Heatmap - 根据scope参数获取数据
    const scope = params.scope;
    
    // 根据范围获取数据
    let heatmapData: SessionEntity[];
    if (scope === 'week') {
      // 本周：使用传入日期所在周的数据
      const weekRangeResult = weekRange(date);
      heatmapData = await this.sessRepo.find({ 
        where: { date: Between(this.toISO(weekRangeResult.monday), this.toISO(weekRangeResult.sunday)) }
      });
      console.log(`Week range: ${this.toISO(weekRangeResult.monday)} to ${this.toISO(weekRangeResult.sunday)}, found ${heatmapData.length} sessions`);
    } else {
      // 本学期：使用从学期开始到传入日期的所有数据
      const endDate = date > new Date(start) ? date : new Date(start);
      heatmapData = await this.sessRepo.find({ 
        where: { date: Between(this.toISO(start), this.toISO(endDate)) }
      });
      console.log(`Semester range: ${this.toISO(start)} to ${this.toISO(endDate)}, found ${heatmapData.length} sessions`);
    }
    
    // 按星期几聚合数据 (1-7 对应 周一到周日)
    const P:PeriodIndex[]=[1,2,3,4,5,6,7,8];
    const matrix = P.map(()=>Array(7).fill(0)); // 固定 8x7

    const labFilter = params.lab ?? 'all';
    console.log(`Heatmap filtering: lab=${labFilter}, scope=${scope}, total sessions=${heatmapData.length}`);
    
    for (const s of heatmapData) {
      if (labFilter !== 'all' && s.lab_id !== Number(labFilter)) continue;
      
      // 计算星期几 (1-7)
      const dayOfWeek = new Date(s.date).getDay();
      const weekday = dayOfWeek === 0 ? 7 : dayOfWeek; // 周日转换为7
      
      matrix[s.period-1][weekday-1] += 1; // 数组索引从0开始
    }
    
    console.log(`Heatmap matrix generated:`, matrix.map(row => row.join(',')).join(' | '));
    
    // 为了兼容性，保留 weeks 数组
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    // projects & excellent（数据库）
    const list = await this.projects.listByYearSorted(currentYear);
    const projects = params.showDone ? list : list.filter(p=>p.status!=='done');
    const excellent = await this.projects.listExcellentForCarousel(currentYear);

    // 获取可视化配置（用于图表数据生成）
    const visualizationConfig = await this.config.getVisualizationConfig();

    // 图表数据 - 根据筛选条件生成
    const chartData = await this.generateChartData(labs, rowsInRange, allProjects, date, start, { ...params.dataAnalysisConfig, visualizationConfig });

    // 计算新增的KPI指标 - 统计整个学期的数据
    const semesterEnd = new Date(start);
    semesterEnd.setMonth(semesterEnd.getMonth() + 4); // 假设学期长度为4个月
    
    const semesterSessions = await this.sessRepo.find({ 
      where: { 
        date: Between(this.toISO(start), this.toISO(semesterEnd)) 
      } 
    });
    
    const totalPlannedAttendance = semesterSessions.reduce((sum: number, s: any) => sum + (s.planned || 0), 0);
    const totalClassHours = semesterSessions.reduce((sum: number, s: any) => sum + (s.duration || 2), 0);
    const totalCourses = semesterSessions.length;
    
    // 计算截止目前的课时数（已上的课时数）
    const currentClassHours = rowsInRange.reduce((sum: number, s: any) => sum + (s.duration || 2), 0);

    // 计算新增的4个KPI指标
    // 1. 涉及专业数（involvedMajors）
    // 2. 涉及班级数（involvedClasses）
    // 3. 平均每课程参与人次（avgStudentsPerCourse）
    // 4. 平均每专业课程数（avgCoursesPerMajor）
    
    const classNamesSet = new Set<string>();
    const majorSet = new Set<string>();
    let totalStudents = 0;
    const courseSet = new Set<string>(); // 用于统计不重复的课程数
    
    // 遍历所有学期课程，统计班级和专业
    for (const session of semesterSessions) {
      // 统计课程（去重）
      courseSet.add(session.course);
      
      // 如果有班级信息，解析并统计
      if (session.class_names && session.class_names.trim()) {
        const classNames = session.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
        for (const className of classNames) {
          classNamesSet.add(className);
          
          // 通过ClassService获取专业信息
          try {
            const classEntity = await this.classService.findByName(className);
            if (classEntity && classEntity.major) {
              majorSet.add(classEntity.major);
            }
          } catch (error) {
            // 如果班级不存在，忽略
            console.warn(`班级不存在: ${className}`);
          }
        }
      }
      
      // 累加参与人数
      totalStudents += session.planned || 0;
    }
    
    const involvedMajors = majorSet.size; // 本学期总专业数
    const involvedClasses = classNamesSet.size; // 本学期总班级数
    const uniqueCourses = courseSet.size; // 不重复的课程数
    const avgStudentsPerCourse = uniqueCourses > 0 ? Number((totalStudents / uniqueCourses).toFixed(1)) : 0; // 平均每课程参与人次

    return {
      date: dateISO, banner: finalBanner,
      spotlight,
      kpi: { 
        courseTotals, 
        attendance, 
        utilization, 
        projectCount, 
        participantCount, 
        labCount, 
        activeLabs, 
        completionRate,
        totalPlannedAttendance,
        totalClassHours,
        totalCourses,
        currentClassHours,
        involvedMajors,
        involvedClasses,
        avgStudentsPerCourse
      },
      heatmap: { labs: ['全部', ...labs.map(l=>l.name)], matrix, weeks },
      excellent, projects,
      projectStats5y: await this.compute5y(),
      chartData
    };
  }

  private async compute5y() {
    const stats = await this.projects.statsByYear();
    console.log('Project stats 5y:', stats); // 调试信息
    return stats;
  }

  private async generateChartData(labs: any[], sessions: any[], projects: any[], currentDate: Date, semesterStart: Date, dataAnalysisConfig?: any) {
    // 根据筛选条件过滤数据
    let filteredSessions = sessions;
    let filteredProjects = projects;
    
    if (dataAnalysisConfig?.middleSection?.dataAnalysis?.selected) {
      const selectedAnalyses = dataAnalysisConfig.middleSection.dataAnalysis.selected;
      
      // 应用时间范围筛选
      const timeRangeFilters = selectedAnalyses
        .map((analysis: any) => analysis.filters?.timeRange)
        .filter(Boolean);
      
      if (timeRangeFilters.length > 0) {
        // 使用最早开始时间和最晚结束时间
        const startDate = new Date(Math.min(...timeRangeFilters.map((tr: any) => new Date(tr.start).getTime())));
        const endDate = new Date(Math.max(...timeRangeFilters.map((tr: any) => new Date(tr.end).getTime())));
        
        filteredSessions = sessions.filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate >= startDate && sessionDate <= endDate;
        });
      }
      
      // 应用实验室筛选
      const labFilters = selectedAnalyses
        .map((analysis: any) => analysis.filters?.labId)
        .filter(Boolean);
      
      if (labFilters.length > 0) {
        const labIds = labFilters.map((id: any) => parseInt(id));
        filteredSessions = filteredSessions.filter(s => labIds.includes(s.lab_id));
      }
    }

    // 1. 项目状态饼图数据 - 显示项目状态分布占比
    const projectStatusPie = [
      { name: '进行中', value: filteredProjects.filter(p => p.status === 'ongoing').length },
      { name: '审核中', value: filteredProjects.filter(p => p.status === 'reviewing').length },
      { name: '已完成', value: filteredProjects.filter(p => p.status === 'done').length }
    ];

    // 2. 周趋势折线图数据 - 显示最近6周的实验人次变化趋势
    const weeklyTrend = [];
    const categories = [];
    for (let i = 5; i >= 0; i--) {
      const weekDate = new Date(currentDate);
      weekDate.setDate(currentDate.getDate() - (i * 7));
      const weekRangeResult = weekRange(weekDate);
      const weekSessions = filteredSessions.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate >= weekRangeResult.monday && sessionDate <= weekRangeResult.sunday;
      });
      const weekAttendance = weekSessions.reduce((sum, s) => sum + s.planned, 0);
      weeklyTrend.push(weekAttendance);
      
      // 计算该周在学期中的实际周数
      const weekNo = weekNoOf(weekDate, semesterStart);
      categories.push(`第${weekNo}周`);
    }

    // 3. 实验室使用率柱状图数据 - 显示各实验室使用率对比
    const labUtilization = {
      categories: labs.map(lab => lab.name),
      values: labs.map(lab => {
        const labSessions = filteredSessions.filter(s => s.lab_id === lab.id);
        const totalSessions = filteredSessions.length;
        const labSessionsCount = labSessions.length;
        // 计算该实验室上课课时占总课时的比例
        return totalSessions > 0 ? Math.round((labSessionsCount / totalSessions) * 100) : 0;
      })
    };

    // 4. 热门项目排行榜数据 - 按参与人数排序，同名项目人数合并
    const projectStats = new Map<string, number>();
    filteredProjects.forEach(project => {
      const title = project.title;
      if (projectStats.has(title)) {
        projectStats.set(title, projectStats.get(title)! + project.member_count);
      } else {
        projectStats.set(title, project.member_count);
      }
    });
    
    const topProjects = Array.from(projectStats.entries())
      .map(([title, totalMembers]) => ({
        name: title.length > 8 ? title.substring(0, 8) + '...' : title, // 限制标题长度
        value: totalMembers
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 5. 课容量利用率仪表盘数据 - 总报课人数/总可容纳人数
    const totalPlannedAttendance = filteredSessions.reduce((sum, s) => sum + s.planned, 0);
    const totalCapacity = filteredSessions.reduce((sum, s) => sum + s.capacity, 0);
    const capacityUtilization = totalCapacity > 0 ? Math.round((totalPlannedAttendance / totalCapacity) * 100) : 0;

    // 6. 教师工作量分析数据 - 各教师授课课时统计
    const teacherWorkload: Array<{ name: string; value: number }> = [];
    const teacherStats = new Map<string, number>();
    filteredSessions.forEach(session => {
      const teacher = session.teacher;
      if (teacherStats.has(teacher)) {
        teacherStats.set(teacher, teacherStats.get(teacher)! + 1);
      } else {
        teacherStats.set(teacher, 1);
      }
    });
    
    teacherStats.forEach((count, teacher) => {
      teacherWorkload.push({
        name: teacher,
        value: count
      });
    });
    
    // 按课时数排序，取前5名
    teacherWorkload.sort((a, b) => b.value - a.value);
    const topTeachers = teacherWorkload.slice(0, 5);

    // 7. 课程专业占比统计（环形图数据）- 生成所有课程的数据
    const courseMajorDistributionMap: Record<string, Array<{ name: string; value: number }>> = {};
    const allCoursesSet = new Set<string>();
    
    // 收集所有课程
    filteredSessions.forEach(s => {
      if (s.course) allCoursesSet.add(s.course);
    });
    const allCourses = Array.from(allCoursesSet).sort();
    
    // 为每个课程生成专业占比数据
    for (const courseName of allCourses) {
      const courseSessions = filteredSessions.filter(s => s.course === courseName);
      const majorStats = new Map<string, number>();
      
      for (const session of courseSessions) {
        if (session.class_names && session.class_names.trim()) {
          const classNames = session.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
          for (const className of classNames) {
            try {
              const classEntity = await this.classService.findByName(className);
              if (classEntity && classEntity.major) {
                const major = classEntity.major;
                const currentCount = majorStats.get(major) || 0;
                majorStats.set(major, currentCount + classEntity.student_count);
              }
            } catch (error) {
              console.warn(`班级不存在: ${className}`);
            }
          }
        }
      }
      
      courseMajorDistributionMap[courseName] = Array.from(majorStats.entries()).map(([major, count]) => ({
        name: major,
        value: count
      }));
    }
    
    // 兼容旧格式：如果没有选择，使用第一个课程的数据
    const visualizationConfig = dataAnalysisConfig?.visualizationConfig || dataAnalysisConfig;
    let courseMajorDistribution: Array<{ name: string; value: number }> = [];
    if (visualizationConfig?.middleSection?.smallCharts?.charts) {
      const charts = visualizationConfig.middleSection.smallCharts.charts;
      for (const chart of charts) {
        if (chart.type === 'donut' && chart.config?.courseName) {
          const courseName = chart.config.courseName;
          courseMajorDistribution = courseMajorDistributionMap[courseName] || [];
          break;
        }
      }
    }
    // 如果没有配置，使用第一个课程的数据
    if (courseMajorDistribution.length === 0 && allCourses.length > 0) {
      courseMajorDistribution = courseMajorDistributionMap[allCourses[0]] || [];
    }

    // 8. 课程-专业堆叠图数据 - 生成所有课程的数据
    let courseMajorStackedAll: { categories: string[]; series: Array<{ name: string; data: number[] }> } = { categories: [], series: [] };
    let courseMajorStacked: { categories: string[]; series: Array<{ name: string; data: number[] }> } = { categories: [], series: [] };
    
    // 生成所有课程的堆叠图数据
    if (allCourses.length > 0) {
      const allMajorsForStacked = new Set<string>();
      const courseMajorDataAll = new Map<string, Map<string, number>>();
      
      allCourses.forEach(course => {
        courseMajorDataAll.set(course, new Map<string, number>());
      });
      
      for (const courseName of allCourses) {
        const courseSessions = filteredSessions.filter(s => s.course === courseName);
        const courseClasses = new Set<string>();
        
        for (const session of courseSessions) {
          if (session.class_names && session.class_names.trim()) {
            const classNames = session.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
            for (const className of classNames) {
              courseClasses.add(className);
            }
          }
        }
        
        const majorClassMap = new Map<string, Set<string>>();
        for (const className of courseClasses) {
          try {
            const classEntity = await this.classService.findByName(className);
            if (classEntity && classEntity.major) {
              const major = classEntity.major;
              allMajorsForStacked.add(major);
              if (!majorClassMap.has(major)) {
                majorClassMap.set(major, new Set<string>());
              }
              majorClassMap.get(major)!.add(className);
            }
          } catch (error) {
            console.warn(`班级不存在: ${className}`);
          }
        }
        
        for (const [major, classSet] of majorClassMap.entries()) {
          let totalCount = 0;
          for (const className of classSet) {
            try {
              const classEntity = await this.classService.findByName(className);
              if (classEntity) {
                totalCount += classEntity.student_count;
              }
            } catch (error) {
              console.warn(`班级不存在: ${className}`);
            }
          }
          courseMajorDataAll.get(courseName)?.set(major, totalCount);
        }
      }
      
      const majorsArray = Array.from(allMajorsForStacked).sort();
      const seriesAll = majorsArray.map(major => ({
        name: major,
        data: allCourses.map(course => courseMajorDataAll.get(course)?.get(major) || 0)
      }));
      
      courseMajorStackedAll = {
        categories: allCourses,
        series: seriesAll
      };
      
      // 兼容旧格式：使用前4个课程
      courseMajorStacked = {
        categories: allCourses.slice(0, 4),
        series: seriesAll.map(s => ({
          ...s,
          data: s.data.slice(0, 4)
        }))
      };
    }
    
    // 9. 专业-课程堆叠图数据 - 生成所有专业的数据
    const allMajorsSet = new Set<string>();
    for (const s of filteredSessions) {
      if (s.class_names && s.class_names.trim()) {
        const classNames = s.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
        for (const className of classNames) {
          try {
            const classEntity = await this.classService.findByName(className);
            if (classEntity && classEntity.major) {
              allMajorsSet.add(classEntity.major);
            }
          } catch (error) {
            // 忽略错误
          }
        }
      }
    }
    const allMajors = Array.from(allMajorsSet).sort();
    
    let majorCourseStackedAll: { categories: string[]; series: Array<{ name: string; data: number[] }> } = { categories: [], series: [] };
    let majorCourseStacked: { categories: string[]; series: Array<{ name: string; data: number[] }> } = { categories: [], series: [] };
    
    // 生成所有专业的堆叠图数据
    if (allMajors.length > 0) {
      const allCoursesForMajorStacked = new Set<string>();
      const majorCourseDataAll = new Map<string, Map<string, number>>();
      const majorFirstClass = new Map<string, string>();
      
      allMajors.forEach(major => {
        majorCourseDataAll.set(major, new Map<string, number>());
      });
      
      for (const majorName of allMajors) {
        for (const session of filteredSessions) {
          if (session.class_names && session.class_names.trim()) {
            const classNames = session.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
            for (const className of classNames) {
              try {
                const classEntity = await this.classService.findByName(className);
                if (classEntity && classEntity.major === majorName) {
                  if (!majorFirstClass.has(majorName)) {
                    majorFirstClass.set(majorName, className);
                  }
                  break;
                }
              } catch (error) {
                // 忽略错误
              }
            }
            if (majorFirstClass.has(majorName)) break;
          }
        }
      }
      
      for (const majorName of allMajors) {
        const firstClassName = majorFirstClass.get(majorName);
        if (!firstClassName) continue;
        
        for (const session of filteredSessions) {
          if (session.class_names && session.class_names.trim()) {
            const classNames = session.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
            if (classNames.includes(firstClassName)) {
              allCoursesForMajorStacked.add(session.course);
              const currentCount = majorCourseDataAll.get(majorName)?.get(session.course) || 0;
              const sessionCount = session.duration || 1;
              majorCourseDataAll.get(majorName)?.set(session.course, currentCount + sessionCount);
            }
          }
        }
      }
      
      const coursesArray = Array.from(allCoursesForMajorStacked).sort();
      const seriesAll = coursesArray.map(course => ({
        name: course,
        data: allMajors.map(major => majorCourseDataAll.get(major)?.get(course) || 0)
      }));
      
      majorCourseStackedAll = {
        categories: allMajors,
        series: seriesAll
      };
      
      // 兼容旧格式：使用前4个专业
      majorCourseStacked = {
        categories: allMajors.slice(0, 4),
        series: seriesAll.map(s => ({
          ...s,
          data: s.data.slice(0, 4)
        }))
      };
    }
    
    // 10. 专业活跃度趋势数据 - 生成所有专业的数据
    let majorTrendAll: { categories: string[]; series: Array<{ name: string; data: number[] }> } = { categories: [], series: [] };
    let majorTrend: { categories: string[]; series: Array<{ name: string; data: number[] }> } = { categories: [], series: [] };
    
    if (allMajors.length > 0) {
      const weeks: string[] = [];
      const majorWeeklyDataAll = new Map<string, number[]>();
      
      allMajors.forEach(major => {
        majorWeeklyDataAll.set(major, []);
      });
      
      for (let i = 5; i >= 0; i--) {
        const weekDate = new Date(currentDate);
        weekDate.setDate(currentDate.getDate() - (i * 7));
        const weekRangeResult = weekRange(weekDate);
        const weekNo = weekNoOf(weekDate, semesterStart);
        weeks.push(`第${weekNo}周`);
        
        const weekSessions = filteredSessions.filter(s => {
          const sessionDate = new Date(s.date);
          return sessionDate >= weekRangeResult.monday && sessionDate <= weekRangeResult.sunday;
        });
        
        for (const majorName of allMajors) {
          let weekCount = 0;
          for (const session of weekSessions) {
            if (session.class_names && session.class_names.trim()) {
              const classNames = session.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
              for (const className of classNames) {
                try {
                  const classEntity = await this.classService.findByName(className);
                  if (classEntity && classEntity.major === majorName) {
                    weekCount += classEntity.student_count;
                  }
                } catch (error) {
                  console.warn(`班级不存在: ${className}`);
                }
              }
            }
          }
          majorWeeklyDataAll.get(majorName)?.push(weekCount);
        }
      }
      
      const seriesAll = allMajors.map(major => ({
        name: major,
        data: majorWeeklyDataAll.get(major) || []
      }));
      
      majorTrendAll = {
        categories: weeks,
        series: seriesAll
      };
      
      // 兼容旧格式：使用前4个专业
      majorTrend = {
        categories: weeks,
        series: seriesAll.slice(0, 4)
      };
    }
    
    // 11. 课程覆盖度分析数据 - 生成所有课程的数据
    let courseCoverageAll: Array<{ name: string; majors: number; classes: number; students: number }> = [];
    let courseCoverage: Array<{ name: string; majors: number; classes: number; students: number }> = [];
    
    for (const courseName of allCourses) {
      const courseSessions = filteredSessions.filter(s => s.course === courseName);
      const majorsSet = new Set<string>();
      const classesSet = new Set<string>();
      let totalStudents = 0;
      
      for (const session of courseSessions) {
        if (session.class_names && session.class_names.trim()) {
          const classNames = session.class_names.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
          for (const className of classNames) {
            classesSet.add(className);
            try {
              const classEntity = await this.classService.findByName(className);
              if (classEntity) {
                if (classEntity.major) {
                  majorsSet.add(classEntity.major);
                }
                totalStudents += classEntity.student_count;
              }
            } catch (error) {
              console.warn(`班级不存在: ${className}`);
            }
          }
        }
      }
      
      courseCoverageAll.push({
        name: courseName,
        majors: majorsSet.size,
        classes: classesSet.size,
        students: totalStudents
      });
    }
    
    // 兼容旧格式：使用前4个课程
    courseCoverage = courseCoverageAll.slice(0, 4);

    // 注意：不再需要根据配置生成数据，所有数据已经生成
    // 前端会根据选择过滤显示

    return {
      projectStatusPie, // 项目状态饼图数据
      weeklyTrend: [{ categories, values: weeklyTrend }], // 周趋势折线图数据
      labUtilization, // 实验室使用率柱状图数据
      topProjects: [{
        categories: topProjects.map(p => p.name),
        values: topProjects.map(p => p.value)
      }], // 热门项目排行榜数据
      gaugeData: { value: capacityUtilization }, // 课容量利用率仪表盘数据
      teacherWorkload: [{
        categories: topTeachers.map(t => t.name),
        values: topTeachers.map(t => t.value)
      }], // 教师工作量分析数据
      courseMajorDistribution, // 课程专业占比统计（环形图数据）- 兼容旧格式
      courseMajorStacked, // 课程-专业堆叠图数据 - 兼容旧格式
      majorCourseStacked, // 专业-课程堆叠图数据 - 兼容旧格式
      majorTrend, // 专业活跃度趋势数据 - 兼容旧格式
      courseCoverage, // 课程覆盖度分析数据 - 兼容旧格式
      // 新增：所有数据（供前端选择）
      courseMajorDistributionMap, // 所有课程的专业占比数据映射
      courseMajorStackedAll, // 所有课程的堆叠图数据
      majorCourseStackedAll, // 所有专业的堆叠图数据
      majorTrendAll, // 所有专业的趋势数据
      courseCoverageAll, // 所有课程的覆盖度数据
      allCourses, // 所有课程列表
      allMajors // 所有专业列表
    };
  }


  getCached(key: string, build: () => Promise<any>) {
    const hit = this.cache.get(key);
    const now = Date.now();
    // 缓存时间增加到10秒，提升性能
    if (hit && now - hit.at < 10000) return Promise.resolve(hit.data);
    return build().then(data=>{ this.cache.set(key,{at:now,data}); return data; });
  }

  /**
   * 生成默认信息横幅
   */
  private async generateDefaultBanner(date: Date, labs: any[], sessionsToday: any[]) {
    // 获取学期开始日期
    const semesterStartISO = await this.config.getSemesterStartMondayISO();
    const semesterStart = new Date(semesterStartISO);
    
    // 计算当前周数
    const weekNo = weekNoOf(date, semesterStart);
    
    // 格式化日期和时间
    const dateStr = date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      weekday: 'long'
    });
    const timeStr = date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    // 找出空闲教室（今天没有课程的教室）
    const occupiedLabIds = new Set(sessionsToday.map(s => s.lab_id));
    const freeLabs = labs.filter(lab => !occupiedLabIds.has(lab.id));
    const freeLabNames = freeLabs.map(lab => lab.name).join('、');
    
    // 生成横幅内容
    let content = `📅 ${dateStr} | 第${weekNo}周 | ⏰ ${timeStr}`;
    if (freeLabNames) {
      content += ` | 🏫 空闲教室：${freeLabNames}`;
    } else {
      content += ` | 🏫 所有教室均有课程安排`;
    }
    
    // 生成滚动内容 - 重复3次并用分隔符连接
    const scrollContent = `${content} • ${content} • ${content} • `;
    
    return {
      content: scrollContent,
      level: 'info' as const,
      expiresAt: null,
      visible: true
    };
  }
}
