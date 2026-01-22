// 功能：班级管理接口。
import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClassService } from './class.service';
import { ClassEntity } from './entities/class.entity';

@ApiTags('班级管理')
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @ApiOperation({ summary: '获取所有班级' })
  async findAll(): Promise<ClassEntity[]> {
    return await this.classService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取班级' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ClassEntity> {
    return await this.classService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建班级' })
  async create(@Body() body: { name: string; major?: string; student_count: number }): Promise<ClassEntity> {
    return await this.classService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新班级' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; major?: string; student_count?: number }
  ): Promise<ClassEntity> {
    return await this.classService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除班级' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.classService.delete(id);
    return { success: true };
  }

  @Post('batch')
  @ApiOperation({ summary: '批量创建班级' })
  async batchCreate(@Body() body: { classes: Array<{ name: string; major?: string; student_count: number }> }): Promise<{ success: number; failed: number; errors: string[] }> {
    return await this.classService.batchCreate(body.classes);
  }

  @Post('clear-all-classes')
  @ApiOperation({ summary: '删除所有班级' })
  async clearAllClasses(): Promise<{ success: boolean; message: string }> {
    await this.classService.clearAllClasses();
    return { success: true, message: '所有班级已删除' };
  }
}

