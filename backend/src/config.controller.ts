// 功能：系统配置相关接口。
import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ConfigService } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly cfg: ConfigService) {}

  @Get('semesterStart')
  async getSemesterStart() {
    return { semesterStartMonday: await this.cfg.getSemesterStartMondayISO() };
  }

  @Put('semesterStart')
  async putSemesterStart(@Body() body: { date: string }) {
    if (!body?.date) throw new BadRequestException('date is required');
    const iso = await this.cfg.setSemesterStart(body.date);
    return { semesterStartMonday: iso };
  }

  @Get('calendar') listCalendar() { return this.cfg.listCalendarOverrides(); }

  @Post('calendar')
  async upsert(@Body() body: { overrides: {date:string; type:'work'|'off'}[]; reset?: boolean }) {
    return this.cfg.upsertCalendar(body.overrides, body.reset);
  }

  @Delete('calendar/:date')
  async del(@Param('date') date: string) { return this.cfg.deleteOverride(date); }

  @Post('bump')
  async bump() { 
    // 增加版本号，用于触发大屏刷新
    const currentVersion = await this.cfg.get('screenVersion', '0')
    const newVersion = String(Number(currentVersion) + 1)
    await this.cfg.set('screenVersion', newVersion)
    return { value: Number(newVersion) }
  }

  @Get('version')
  async getVersion() {
    // 获取当前版本号，用于大屏检查是否需要刷新
    const version = await this.cfg.get('screenVersion', '0')
    return { value: Number(version) }
  }

  // 大屏显示模式配置
  @Get('screen/display-mode')
  async getScreenDisplayMode() {
    return { mode: await this.cfg.getScreenDisplayMode() };
  }

  @Put('screen/display-mode')
  async setScreenDisplayMode(@Body() body: { mode: 'fixed' | 'adaptive' }) {
    if (!body?.mode) throw new BadRequestException('mode is required');
    const mode = await this.cfg.setScreenDisplayMode(body.mode);
    return { mode };
  }

  // 大屏固定模式配置
  @Get('screen/fixed-config')
  async getScreenFixedConfig() {
    return await this.cfg.getScreenFixedConfig();
  }

  @Put('screen/fixed-config')
  async setScreenFixedConfig(@Body() body: { width: number; height: number; scale: number }) {
    if (!body?.width || !body?.height || !body?.scale) {
      throw new BadRequestException('width, height, and scale are required');
    }
    return await this.cfg.setScreenFixedConfig(body);
  }

  // 可视化配置
  @Get('visualization')
  async getVisualizationConfig() {
    return await this.cfg.getVisualizationConfig();
  }

  @Put('visualization')
  async setVisualizationConfig(@Body() body: any) {
    if (!body) throw new BadRequestException('config is required');
    return await this.cfg.setVisualizationConfig(body);
  }

  // 强制更新KPI配置到最新版本
  @Post('visualization/update-kpi')
  async updateKpiConfigToLatest() {
    return await this.cfg.updateKpiConfigToLatest();
  }

  // 训练营标题配置
  @Get('project-list-title')
  async getProjectListTitle() {
    return { title: await this.cfg.getProjectListTitle() };
  }

  @Put('project-list-title')
  async setProjectListTitle(@Body() body: { title: string }) {
    if (!body?.title) throw new BadRequestException('title is required');
    const title = await this.cfg.setProjectListTitle(body.title);
    return { title };
  }

  // 获取所有配置（合并接口）
  @Get('all-config')
  async getAllConfig() {
    const [displayMode, fixedConfig, visualization, version, projectListTitle] = await Promise.all([
      this.getScreenDisplayMode().catch(() => ({ mode: 'adaptive' })),
      this.getScreenFixedConfig().catch(() => ({ width: 1920, height: 1080, scale: 100 })),
      this.getVisualizationConfig().catch(() => ({
        kpi: {
          available: [
            "courseTotals", "attendance", "utilization", "projectCount", 
            "participantCount", "labCount", "activeLabs", "completionRate",
            "totalPlannedAttendance", "totalClassHours", "totalCourses", "currentClassHours"
          ],
          selected: ["courseTotals", "attendance", "utilization"]
        },
        middleSection: {
          mode: 'four-small',
          largeChart: { type: 'heatmap', config: {} },
          smallCharts: {
            charts: [
              { type: 'gauge', title: '课容量利用率' },
              { type: 'teacher', title: '教师工作量分析' },
              { type: 'line', title: '时间趋势' },
              { type: 'ranking', title: '热门项目' }
            ]
          }
        }
      })),
      this.getVersion().catch(() => ({ value: 0 })),
      this.cfg.getProjectListTitle().catch(() => '第1期训练营')
    ])
    
    return {
      displayMode,
      fixedConfig,
      visualization,
      version,
      projectListTitle
    }
  }
}
