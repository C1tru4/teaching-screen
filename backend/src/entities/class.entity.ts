// 功能：班级数据实体。
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('classes')
export class ClassEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  name!: string; // 班级名称，如 "计算机1班"

  @Column({ type: 'text', nullable: true })
  major!: string | null; // 专业，如 "计算机科学与技术"

  @Column({ type: 'integer' })
  student_count!: number; // 班级人数
}

