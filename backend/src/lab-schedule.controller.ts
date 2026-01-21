import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SessionEntity } from './entities/session.entity';
import { LabEntity } from './entities/lab.entity';

@ApiTags('课表管理')
@Controller('lab-schedule')
export class LabScheduleController {
  constructor(
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(LabEntity)
    private labRepository: Repository<LabEntity>,
  ) {}

  @Get(':id/schedule')
  @ApiOperation({ summary: '获取实验室课表' })
  @ApiParam({ name: 'id', description: '实验室ID' })
  @ApiQuery({ name: 'date', description: '查询日期 (YYYY-MM-DD)', required: false })
  async getLabSchedule(
    @Param('id') labId: number,
    @Query('date') date?: string,
  ) {
    try {
      // 如果没有提供日期，使用今天
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 获取实验室信息
      const lab = await this.labRepository.findOne({
        where: { id: labId }
      });

      if (!lab) {
        return {
          success: false,
          message: '实验室不存在',
          data: null
        };
      }

      // 获取当天的课程安排
      const sessions = await this.sessionRepository.find({
        where: {
          lab_id: labId,
          date: targetDate.toISOString().split('T')[0], // YYYY-MM-DD 格式
        },
        order: {
          period: 'ASC'
        }
      });

      // 转换数据格式
      const schedule = sessions.map(session => {
        const now = new Date();
        const sessionStart = new Date(`${session.date}T${session.period}:00`);
        const sessionEnd = new Date(sessionStart.getTime() + (session.duration || 2) * 60 * 60 * 1000);

        let status: 'ongoing' | 'upcoming' | 'completed' = 'upcoming';
        if (now >= sessionStart && now <= sessionEnd) {
          status = 'ongoing';
        } else if (now > sessionEnd) {
          status = 'completed';
        }

        return {
          id: session.id,
          course: session.course || '未命名课程',
          teacher: session.teacher || '未指定教师',
          time: `${session.period}-${sessionEnd.toTimeString().slice(0, 5)}`,
          duration: session.duration || 2,
          planned: session.planned || 0,
          status,
          content: session.content || '',
          room: '' // SessionEntity 中没有 room 字段
        };
      });

      return {
        success: true,
        message: '获取课表成功',
        data: {
          lab: {
            id: lab.id,
            name: lab.name,
            capacity: lab.capacity
          },
          date: targetDate.toISOString().split('T')[0],
          schedule
        }
      };

    } catch (error) {
      console.error('获取课表失败:', error);
      return {
        success: false,
        message: '获取课表失败',
        data: null
      };
    }
  }

  @Get(':id/week-schedule')
  @ApiOperation({ summary: '获取实验室本周课表' })
  @ApiParam({ name: 'id', description: '实验室ID' })
  @ApiQuery({ name: 'week', description: '周数 (YYYY-WW)', required: false })
  async getLabWeekSchedule(
    @Param('id') labId: number,
    @Query('week') week?: string,
  ) {
    try {
      // 如果没有提供周数，使用当前周
      const targetWeek = week || this.getCurrentWeek();
      const weekDates = this.getWeekDates(targetWeek);

      // 获取实验室信息
      const lab = await this.labRepository.findOne({
        where: { id: labId }
      });

      if (!lab) {
        return {
          success: false,
          message: '实验室不存在',
          data: null
        };
      }

      // 获取本周的课程安排
      const sessions = await this.sessionRepository.find({
        where: {
          lab_id: labId,
          date: In(weekDates.map(date => date.toISOString().split('T')[0]))
        },
        order: {
          date: 'ASC',
          period: 'ASC'
        }
      });

      // 按日期分组
      const scheduleByDate = weekDates.reduce((acc, date) => {
        const dateStr = date.toISOString().split('T')[0];
        acc[dateStr] = sessions
          .filter(session => session.date === dateStr)
          .map(session => {
            const now = new Date();
            const sessionStart = new Date(`${session.date}T${session.period}:00`);
            const sessionEnd = new Date(sessionStart.getTime() + (session.duration || 2) * 60 * 60 * 1000);

            let status: 'ongoing' | 'upcoming' | 'completed' = 'upcoming';
            if (now >= sessionStart && now <= sessionEnd) {
              status = 'ongoing';
            } else if (now > sessionEnd) {
              status = 'completed';
            }

            return {
              id: session.id,
              course: session.course || '未命名课程',
              teacher: session.teacher || '未指定教师',
              time: `${session.period}-${sessionEnd.toTimeString().slice(0, 5)}`,
              duration: session.duration || 2,
              planned: session.planned || 0,
              status,
              content: session.content || '',
              room: '' // SessionEntity 中没有 room 字段
            };
          });
        return acc;
      }, {} as Record<string, any[]>);

      return {
        success: true,
        message: '获取本周课表成功',
        data: {
          lab: {
            id: lab.id,
            name: lab.name,
            capacity: lab.capacity
          },
          week: targetWeek,
          schedule: scheduleByDate
        }
      };

    } catch (error) {
      console.error('获取本周课表失败:', error);
      return {
        success: false,
        message: '获取本周课表失败',
        data: null
      };
    }
  }

  // 获取当前周数 (YYYY-WW)
  private getCurrentWeek(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-${weekNumber.toString().padStart(2, '0')}`;
  }

  // 获取指定周的所有日期
  private getWeekDates(week: string): Date[] {
    const [year, weekNum] = week.split('-').map(Number);
    const startOfYear = new Date(year, 0, 1);
    const startOfWeek = new Date(startOfYear.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }
}
