import { Body, Controller, Get, Param, Patch, Post, Put, Query, BadRequestException } from '@nestjs/common';
import { LabsService } from './labs.service';

type ISODate = string;
type PeriodIndex = 1|2|3|4|5|6|7|8;

@Controller('labs')
export class LabsController {
  constructor(private readonly svc: LabsService) {}

  @Get() listLabs() { return this.svc.listLabs(); }

  @Get('courses')
  async listCourses() {
    return this.svc.listCourses();
  }

  @Patch(':id')
  async updateLab(@Param('id') idParam: string, @Body() body: { capacity?: number }) {
    if (body.capacity===undefined) throw new BadRequestException('capacity is required');
    return await this.svc.updateCapacity(Number(idParam), Number(body.capacity));
  }

  @Get(':id/timetable')
  getTimetable(@Param('id') idParam: string, @Query('date') date?: ISODate) {
    return this.svc.getWeekTimetable(Number(idParam), date!);
  }

  @Put(':id/timetable')
  putTimetable(
    @Param('id') idParam: string,
    @Query('date') date: ISODate,
    @Body() body: { sessions: Array<{date:ISODate;period:PeriodIndex;course:string;teacher:string;content?:string;planned:number;capacity?:number;allow_makeup?:boolean;duration?:number;classNames?:string;}> }
  ) {
    return this.svc.putWeekTimetable(Number(idParam), date, body);
  }

  @Post('clear-timetable')
  async clearTimetableData(@Body() body: { labId?: number }) {
    try {
      await this.svc.clearTimetableData(body.labId)
      return {
        success: true,
        message: body.labId ? `教室${body.labId}的课表数据已删除` : '所有课表数据已删除'
      }
    } catch (error: any) {
      throw new BadRequestException(`删除课表数据失败: ${error.message}`)
    }
  }

  @Post(':id/timetable/batch')
  async batchUploadTimetable(
    @Param('id') idParam: string,
    @Query('date') date: ISODate,
    @Body() body: { sessions: Array<{date:ISODate;period:PeriodIndex;course:string;teacher:string;content?:string;planned?:number;capacity?:number;allow_makeup?:boolean;duration?:number;classNames?:string; labId?: number; lab?: string; 实验室?: string; 教室?: string;}> },
    @Query('dryRun') dryRun?: string
  ) {
    if (!body.sessions || !Array.isArray(body.sessions)) {
      throw new BadRequestException('请提供课程数组')
    }

    type RowError = { index: number; field?: string; message: string }
    const results: Array<{ labId: number; date: ISODate; period: PeriodIndex; course: string; teacher: string; content?: string; planned?: number; duration?: number; classNames?: string; }> = []
    const errors: RowError[] = []

    for (let i = 0; i < body.sessions.length; i++) {
      try {
        const session = body.sessions[i]
        // 验证必填字段
        if (!session.date || !session.period || !session.course || !session.teacher) {
          errors.push({ index: i + 1, message: '日期、节次、课程名称、教师为必填项' })
          continue
        }
        
        // 验证教室字段（必填）
        if (!session.labId && !(session as any)['教室'] && !(session as any)['实验室'] && !session.lab) {
          errors.push({ index: i + 1, field: 'lab', message: '教室字段为必填项，请指定教室名称或ID' })
          continue
        }
        
        // 解析实验室：必须指定教室（labId 或 教室/实验室名字）
        let resolvedLabId: number
        if (session.labId) {
          resolvedLabId = Number(session.labId)
        } else if ((session as any)['教室'] || (session as any)['实验室'] || session.lab) {
          const name = (session as any)['教室'] || (session as any)['实验室'] || (session as any).lab
          const id = await this.svc.resolveLabIdByName(String(name))
          if (!id) {
            errors.push({ index: i + 1, field: 'lab', message: `教室名称未找到：${name}` })
            continue
          }
          resolvedLabId = id
        } else {
          // 这种情况不应该发生，因为前面已经验证了教室字段必填
          errors.push({ index: i + 1, field: 'lab', message: '教室字段为必填项，请指定教室名称或ID' })
          continue
        }

        // 验证日期格式
        if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date)) {
          errors.push({ index: i + 1, field: 'date', message: '日期格式错误，应为YYYY-MM-DD' })
          continue
        }

        // 验证节次
        if ((session as any).period < 1 || (session as any).period > 8) {
          errors.push({ index: i + 1, field: 'period', message: '节次必须在1-8之间' })
          continue
        }

        results.push({
          labId: resolvedLabId,
          date: session.date,
          period: session.period as PeriodIndex,
          course: session.course,
          teacher: session.teacher,
          content: session.content,
          classNames: (session as any).classNames || undefined,
          planned: (session as any).classNames ? undefined : Number((session as any).planned ?? 0),
          duration: Number((session as any).duration ?? 2)
        })
      } catch (error: any) {
        errors.push({ index: i + 1, message: error.message || '未知错误' })
      }
    }

    if (errors.length > 0) {
      return {
        success: 0,
        failed: errors.length,
        errors
      }
    }

    // dryRun 模式：仅返回校验结果，不落库
    if (dryRun === 'true') {
      return {
        success: results.length,
        failed: 0,
        results
      }
    }

    // 如果验证通过，保存到数据库
    // 改为增量插入，不再按周覆盖
    const result = await this.svc.insertSessionsRaw(results)
    const saveErrors = result.errors || []
    
    // 合并验证错误和保存错误
    const allErrors = [...errors, ...saveErrors]
    
    if (allErrors.length > 0) {
      return {
        success: result.inserted + (result.updated || 0),
        failed: allErrors.length,
        inserted: result.inserted,
        updated: result.updated || 0,
        errors: allErrors
      }
    }
    
    return {
      success: result.inserted + (result.updated || 0),
      failed: 0,
      inserted: result.inserted,
      updated: result.updated || 0,
      results
    }
  }
}
