// 功能：系统配置读写服务。
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigKVEntity } from './entities/config-kv.entity';
import { CalendarOverrideEntity } from './entities/calendar-override.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(ConfigKVEntity) private cfgRepo: Repository<ConfigKVEntity>,
    @InjectRepository(CalendarOverrideEntity) private calRepo: Repository<CalendarOverrideEntity>,
  ) {}

  private async getKV(k: string, def: string) {
    const row = await this.cfgRepo.findOneBy({ k });
    if (!row) return def;
    return row.v;
  }
  private async setKV(k: string, v: string) {
    await this.cfgRepo.save({ k, v });
  }

  // 公共方法，用于获取和设置任意配置
  async get(k: string, def: string = '') {
    return await this.getKV(k, def);
  }

  async set(k: string, v: string) {
    await this.setKV(k, v);
  }

  async getSemesterStartMondayISO() {
    return await this.getKV('semesterStartMondayISO', '2025-09-01');
  }

  async setSemesterStart(dateISO: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) throw new BadRequestException('YYYY-MM-DD required');
    const d = new Date(dateISO);
    if (isNaN(d.getTime())) throw new BadRequestException('invalid date');
    
    // 计算到本周一的距离
    const dayOfWeek = d.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - daysToMonday);
    
    const iso = `${monday.getFullYear()}-${`${monday.getMonth()+1}`.padStart(2,'0')}-${`${monday.getDate()}`.padStart(2,'0')}`;
    await this.setKV('semesterStartMondayISO', iso);
    return iso;
  }

  listCalendarOverrides() { return this.calRepo.find({ order: { date: 'ASC' } }); }

  async upsertCalendar(overrides: {date:string; type:'work'|'off'}[], reset?: boolean) {
    if (reset) await this.calRepo.clear();
    for (const it of overrides) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date) || (it.type!=='work' && it.type!=='off')) {
        throw new BadRequestException(`invalid override ${JSON.stringify(it)}`);
      }
      await this.calRepo.save({ date: it.date, type: it.type });
    }
    return this.listCalendarOverrides();
  }

  async deleteOverride(date: string) {
    await this.calRepo.delete({ date });
    return this.listCalendarOverrides();
  }

  // 大屏显示模式配置
  async getScreenDisplayMode() {
    return await this.getKV('screenDisplayMode', 'adaptive'); // 默认自适应模式
  }

  async setScreenDisplayMode(mode: 'fixed' | 'adaptive') {
    if (!['fixed', 'adaptive'].includes(mode)) {
      throw new BadRequestException('mode must be "fixed" or "adaptive"');
    }
    await this.setKV('screenDisplayMode', mode);
    return mode;
  }

  // 大屏固定模式配置
  async getScreenFixedConfig() {
    const width = await this.getKV('screenFixedWidth', '1920');
    const height = await this.getKV('screenFixedHeight', '1080');
    const scale = await this.getKV('screenFixedScale', '100');
    return { width: parseInt(width), height: parseInt(height), scale: parseInt(scale) };
  }

  async setScreenFixedConfig(config: { width: number; height: number; scale: number }) {
    if (config.width < 800 || config.width > 3840) {
      throw new BadRequestException('width must be between 800 and 3840');
    }
    if (config.height < 600 || config.height > 2160) {
      throw new BadRequestException('height must be between 600 and 2160');
    }
    if (config.scale < 50 || config.scale > 200) {
      throw new BadRequestException('scale must be between 50 and 200');
    }
    
    await this.setKV('screenFixedWidth', config.width.toString());
    await this.setKV('screenFixedHeight', config.height.toString());
    await this.setKV('screenFixedScale', config.scale.toString());
    return config;
  }

  // 可视化配置
  async getVisualizationConfig() {
    const kpiAvailable = await this.getKV('visualization_kpi_available', '["courseTotals","attendance","utilization","projectCount","participantCount","labCount","activeLabs","completionRate","totalPlannedAttendance","totalClassHours","totalCourses","currentClassHours","involvedMajors","involvedClasses","avgStudentsPerCourse"]');
    const kpiSelected = await this.getKV('visualization_kpi_selected', '["courseTotals","attendance","utilization"]');
    const middleMode = await this.getKV('visualization_middle_mode', 'large');
    const largeChartType = await this.getKV('visualization_large_chart_type', 'heatmap');
    const smallCharts = await this.getKV('visualization_small_charts', '[{"type":"pie","title":"实验室使用率"},{"type":"bar","title":"项目状态分布"},{"type":"line","title":"时间趋势"},{"type":"ranking","title":"热门项目"}]');
    
    return {
      kpi: {
        available: JSON.parse(kpiAvailable),
        selected: JSON.parse(kpiSelected)
      },
      middleSection: {
        mode: middleMode,
        largeChart: {
          type: largeChartType,
          config: {}
        },
        smallCharts: {
          charts: JSON.parse(smallCharts)
        }
      }
    };
  }

  async setVisualizationConfig(config: any) {
    // 验证KPI配置
    if (config.kpi) {
      if (config.kpi.available && Array.isArray(config.kpi.available)) {
        await this.setKV('visualization_kpi_available', JSON.stringify(config.kpi.available));
      }
      if (config.kpi.selected && Array.isArray(config.kpi.selected) && config.kpi.selected.length === 3) {
        await this.setKV('visualization_kpi_selected', JSON.stringify(config.kpi.selected));
      }
    }

    // 验证中间部分配置
    if (config.middleSection) {
      if (config.middleSection.mode && ['large', 'four-small'].includes(config.middleSection.mode)) {
        await this.setKV('visualization_middle_mode', config.middleSection.mode);
      }
      if (config.middleSection.largeChart && config.middleSection.largeChart.type) {
        await this.setKV('visualization_large_chart_type', config.middleSection.largeChart.type);
      }
      if (config.middleSection.smallCharts && config.middleSection.smallCharts.charts && Array.isArray(config.middleSection.smallCharts.charts) && config.middleSection.smallCharts.charts.length === 4) {
        // 保存图表配置，包括config字段（课程选择、专业选择等）
        await this.setKV('visualization_small_charts', JSON.stringify(config.middleSection.smallCharts.charts));
      }
    }

    return await this.getVisualizationConfig();
  }

  // 强制更新KPI配置到最新版本
  async updateKpiConfigToLatest() {
    const latestAvailable = [
      "courseTotals",
      "attendance",
      "utilization",
      "projectCount",
      "participantCount",
      "labCount",
      "activeLabs",
      "completionRate",
      "totalPlannedAttendance",
      "totalClassHours",
      "totalCourses",
      "currentClassHours",
      "involvedMajors",
      "involvedClasses",
      "avgStudentsPerCourse"
    ];

    const latestSelected = [
      "courseTotals",
      "attendance",
      "utilization"
    ];

    await this.setKV('visualization_kpi_available', JSON.stringify(latestAvailable));
    await this.setKV('visualization_kpi_selected', JSON.stringify(latestSelected));

    return await this.getVisualizationConfig();
  }

  // 训练营标题配置
  async getProjectListTitle() {
    return await this.getKV('projectListTitle', '第1期训练营');
  }

  async setProjectListTitle(title: string) {
    if (!title || title.trim().length === 0) {
      throw new BadRequestException('title is required');
    }
    await this.setKV('projectListTitle', title.trim());
    return title.trim();
  }
}
