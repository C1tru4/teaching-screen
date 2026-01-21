import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassEntity } from './entities/class.entity';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>
  ) {}

  /**
   * 根据班级名称获取班级信息
   */
  async findByName(name: string): Promise<ClassEntity | null> {
    return await this.classRepo.findOne({ where: { name } });
  }

  /**
   * 根据班级名称列表获取班级信息并计算总人数
   * @param classNames 班级名称字符串，支持逗号、顿号分隔
   * @returns 总人数
   */
  async calculateTotalStudents(classNames: string): Promise<number> {
    if (!classNames || !classNames.trim()) {
      return 0;
    }

    // 支持逗号、顿号分隔
    const names = classNames.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    if (names.length === 0) {
      return 0;
    }

    let total = 0;
    const notFoundClasses: string[] = [];

    for (const name of names) {
      const classEntity = await this.findByName(name);
      if (!classEntity) {
        notFoundClasses.push(name);
      } else {
        total += classEntity.student_count;
      }
    }

    if (notFoundClasses.length > 0) {
      throw new BadRequestException(`以下班级不存在: ${notFoundClasses.join(', ')}`);
    }

    return total;
  }

  /**
   * 获取所有班级
   */
  async findAll(): Promise<ClassEntity[]> {
    return await this.classRepo.find({ order: { name: 'ASC' } });
  }

  /**
   * 根据ID获取班级
   */
  async findOne(id: number): Promise<ClassEntity> {
    const classEntity = await this.classRepo.findOne({ where: { id } });
    if (!classEntity) {
      throw new NotFoundException(`班级不存在: ${id}`);
    }
    return classEntity;
  }

  /**
   * 创建班级
   */
  async create(data: { name: string; major?: string; student_count: number }): Promise<ClassEntity> {
    // 检查是否已存在同名班级
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new BadRequestException(`班级已存在: ${data.name}`);
    }

    const classEntity = this.classRepo.create({
      name: data.name,
      major: data.major || null,
      student_count: data.student_count
    });

    return await this.classRepo.save(classEntity);
  }

  /**
   * 更新班级
   */
  async update(id: number, data: { name?: string; major?: string; student_count?: number }): Promise<ClassEntity> {
    const classEntity = await this.findOne(id);

    if (data.name !== undefined) {
      // 如果修改了名称，检查新名称是否已存在
      if (data.name !== classEntity.name) {
        const existing = await this.findByName(data.name);
        if (existing) {
          throw new BadRequestException(`班级已存在: ${data.name}`);
        }
      }
      classEntity.name = data.name;
    }

    if (data.major !== undefined) {
      classEntity.major = data.major || null;
    }

    if (data.student_count !== undefined) {
      classEntity.student_count = data.student_count;
    }

    return await this.classRepo.save(classEntity);
  }

  /**
   * 删除班级
   */
  async delete(id: number): Promise<void> {
    const classEntity = await this.findOne(id);
    await this.classRepo.remove(classEntity);
  }

  /**
   * 批量创建班级
   */
  async batchCreate(classes: Array<{ name: string; major?: string; student_count: number }>): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const cls of classes) {
      try {
        await this.create(cls);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${cls.name}: ${error.message || '创建失败'}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * 删除所有班级
   */
  async clearAllClasses(): Promise<void> {
    await this.classRepo.clear();
  }
}

