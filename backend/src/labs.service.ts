import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { LabEntity } from './entities/lab.entity';
import { SessionEntity } from './entities/session.entity';
import { ClassService } from './class.service';
import { periodRange } from './time.utils';

type ISODate = string;
type PeriodIndex = 1|2|3|4|5|6|7|8;

@Injectable()
export class LabsService {
  constructor(
    @InjectRepository(LabEntity) private labsRepo: Repository<LabEntity>,
    @InjectRepository(SessionEntity) private sessRepo: Repository<SessionEntity>,
    private classService: ClassService,
  ) {}

  listLabs() { return this.labsRepo.find({ order: { id: 'ASC' } }); }

  /**
   * 获取所有不重复的课程名称列表
   */
  async listCourses(): Promise<string[]> {
    const sessions = await this.sessRepo.find({
      select: ['course'],
      where: {}
    });
    const uniqueCourses = Array.from(new Set(sessions.map(s => s.course).filter(Boolean)));
    return uniqueCourses.sort();
  }

  async resolveLabIdByName(name: string): Promise<number | null> {
    const n = String(name || '').trim()
    if (!n) return null
    const lab = await this.labsRepo.findOne({ where: { name: n } })
    return lab ? lab.id : null
  }

  async updateCapacity(id: number, capacity: number) {
    const lab = await this.labsRepo.findOneBy({ id });
    if (!lab) throw new BadRequestException('Lab not found');
    lab.capacity = Math.floor(capacity);
    return await this.labsRepo.save(lab);
  }

  async getWeekTimetable(labId: number, anyDateISO: ISODate) {
    const date = new Date(anyDateISO);
    if (isNaN(date.getTime())) throw new BadRequestException('invalid date');
    
    // 计算本周一
    const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const toISO = (d: Date) => {
      const y=d.getFullYear(), m=`${d.getMonth()+1}`.padStart(2,'0'), dd=`${d.getDate()}`.padStart(2,'0');
      return `${y}-${m}-${dd}`;
    };
    const periods = periodRange(date).map(p => ({ p: p.p as PeriodIndex, start: p.start, end: p.end }));
    const rows = await this.sessRepo.find({
      where: { lab_id: labId, date: Between(toISO(monday), toISO(sunday)) },
      order: { date: 'ASC', period: 'ASC' }
    });

    // 组装
    const days = Array.from({length:7},(_,i)=>{
      const d=new Date(monday); d.setDate(monday.getDate()+i);
      return {
        date: toISO(d),
        dayOfWeek: ((d.getDay()+6)%7+1) as 1|2|3|4|5|6|7,
        slots: periods.map(pp=>{
          const s = rows.find(r=>r.date===toISO(d) && r.period===pp.p);
          return s ? {
            period: pp.p, start: pp.start, end: pp.end,
            session: { ...s }
          } : { period: pp.p, start: pp.start, end: pp.end, session: null };
        })
      };
    });

    const lab = await this.labsRepo.findOneByOrFail({ id: labId });

    return {
      lab,
      week: { monday: toISO(monday), sunday: toISO(sunday) },
      periods,
      days
    };
  }

  async putWeekTimetable(labId: number, anyDateISO: ISODate, body: {
    sessions: Array<{ date: ISODate; period: PeriodIndex; course: string; teacher: string; content?: string; planned: number; capacity?: number; allow_makeup?: boolean; duration?: number; classNames?: string; }>
  }) {
    const lab = await this.labsRepo.findOneBy({ id: labId });
    if (!lab) throw new BadRequestException('Lab not found');
    if (!body?.sessions || !Array.isArray(body.sessions)) throw new BadRequestException('sessions required');

    const date = new Date(anyDateISO);
    if (isNaN(date.getTime())) throw new BadRequestException('invalid date');
    
    // 计算本周一
    const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const toISO = (d: Date) => {
      const y=d.getFullYear(), m=`${d.getMonth()+1}`.padStart(2,'0'), dd=`${d.getDate()}`.padStart(2,'0');
      return `${y}-${m}-${dd}`;
    };
    const inWeek = (iso: string) => iso>=toISO(monday) && iso<=toISO(sunday);
    const validPeriods = new Set([1,2,3,4,5,6,7,8]);

    // 删除该周旧记录
    const olds = await this.sessRepo.find({ where: { lab_id: labId, date: Between(toISO(monday), toISO(sunday)) }});
    if (olds.length) await this.sessRepo.remove(olds);

    // 插入新记录
    const rows: SessionEntity[] = [];
    for (const it of body.sessions) {
      if (!it) continue;
      if (!inWeek(it.date)) throw new BadRequestException(`date ${it.date} not in target week`);
      if (!validPeriods.has(it.period)) throw new BadRequestException(`invalid period ${it.period}`);
      const capacity = Math.floor(Number(it.capacity ?? lab.capacity));
      const duration = Math.max(1, Math.floor(Number(it.duration ?? 2))); // 默认2课时
      // 计算 planned：如果同时提供了 planned 和 classNames，优先使用 planned；如果只有 classNames，则根据班级计算
      let finalPlanned = 0;
      let classNames: string | null = null;
      
      if (it.classNames && it.classNames.trim()) {
        classNames = it.classNames.trim();
      }
      
      // 如果同时提供了 planned 和 classNames，优先使用 planned
      if (it.planned !== undefined && it.planned !== null) {
        finalPlanned = Math.max(0, Math.floor(Number(it.planned)));
      } else if (classNames) {
        // 如果只提供了 classNames，根据班级计算人数
        try {
          finalPlanned = await this.classService.calculateTotalStudents(classNames);
        } catch (error: any) {
          throw new BadRequestException(`计算班级人数失败: ${error.message}`);
        }
      }
      
      const finalAllow = finalPlanned < capacity ? 1 : 0;
      
      const e = this.sessRepo.create({
        lab_id: labId,
        date: it.date,
        period: it.period,
        course: String(it.course),
        teacher: String(it.teacher),
        content: it.content ?? null,
        planned: finalPlanned,
        capacity,
        allow_makeup: finalAllow,
        duration,
        class_names: classNames
      });
      rows.push(e);
    }
    await this.sessRepo.save(rows);
    return this.getWeekTimetable(labId, anyDateISO);
  }

  /**
   * 按行插入课程（不按周覆盖，不删除旧数据）。
   * 容量取实验室容量；allow_makeup 根据 planned < capacity 计算。
   * 如果提供了 classNames，则根据班级自动计算 planned；否则使用传入的 planned 值。
   */
  async insertSessionsRaw(items: Array<{ labId: number; date: ISODate; period: PeriodIndex; course: string; teacher: string; content?: string; planned?: number; duration?: number; classNames?: string; }>) {
    if (!Array.isArray(items) || items.length === 0) return { inserted: 0, updated: 0, errors: [] }
    // 预取实验室容量
    const labIds = Array.from(new Set(items.map(i => i.labId)))
    const labs = await this.labsRepo.find({ where: { id: In(labIds) } })
    const idToCapacity = new Map<number, number>(labs.map(l => [l.id, l.capacity]))

    const toISO = (s: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BadRequestException('invalid date format')
      return s
    }
    const validPeriods = new Set([1,2,3,4,5,6,7,8])

    let inserted = 0
    let updated = 0
    const errors: Array<{ index: number; message: string }> = []
    
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx]
      try {
        const cap = idToCapacity.get(it.labId)
        if (!cap) {
          errors.push({ index: idx + 1, message: `教室ID ${it.labId} 不存在` })
          continue
        }
        if (!validPeriods.has(it.period)) {
          errors.push({ index: idx + 1, message: `节次 ${it.period} 无效，必须在1-8之间` })
          continue
        }
        const capacity = Math.floor(Number(cap))
        
        // 计算 planned：如果同时提供了 planned 和 classNames，优先使用 planned；如果只有 classNames，则根据班级计算
        let planned = 0;
        let classNames: string | null = null;
        
        if (it.classNames && it.classNames.trim()) {
          classNames = it.classNames.trim();
        }
        
        // 如果同时提供了 planned 和 classNames，优先使用 planned
        if (it.planned !== undefined && it.planned !== null) {
          planned = Math.max(0, Math.floor(Number(it.planned)));
        } else if (classNames) {
          // 如果只提供了 classNames，根据班级计算人数
          try {
            planned = await this.classService.calculateTotalStudents(classNames);
          } catch (error: any) {
            errors.push({ index: idx + 1, message: `计算班级人数失败: ${error.message}` })
            continue
          }
        } else {
          // 都没有提供，默认为0
          planned = 0;
        }
        
        const allow = planned < capacity ? 1 : 0
        const duration = Math.max(1, Math.floor(Number(it.duration ?? 2))) // 默认2课时
        
        // 检查是否已存在相同的记录
        let existing
        try {
          existing = await this.sessRepo.findOne({
            where: {
              lab_id: it.labId,
              date: toISO(it.date),
              period: it.period
            }
          })
        } catch (error: any) {
          errors.push({ index: idx + 1, message: `日期格式错误: ${it.date}` })
          continue
        }
        
        if (existing) {
          // 更新现有记录
          existing.course = String(it.course)
          existing.teacher = String(it.teacher)
          existing.content = it.content ?? null
          existing.planned = planned
          existing.capacity = capacity
          existing.allow_makeup = allow
          existing.duration = duration
          existing.class_names = classNames
          await this.sessRepo.save(existing)
          updated++
        } else {
          // 创建新记录
          const e = this.sessRepo.create({
            lab_id: it.labId,
            date: toISO(it.date),
            period: it.period,
            course: String(it.course),
            teacher: String(it.teacher),
            content: it.content ?? null,
            planned,
            capacity,
            allow_makeup: allow,
            duration,
            class_names: classNames
          })
          await this.sessRepo.save(e)
          inserted++
        }
      } catch (error: any) {
        errors.push({ index: idx + 1, message: error.message || '保存失败' })
      }
    }
    
    return { inserted, updated, errors }
  }

  async clearTimetableData(labId?: number) {
    if (labId) {
      // 删除指定教室的课表数据
      await this.sessRepo.delete({ lab_id: labId })
    } else {
      // 删除所有课表数据
      await this.sessRepo.clear()
    }
  }
}
