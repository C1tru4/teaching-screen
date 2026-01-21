import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { LabEntity } from './lab.entity';

@Entity('sessions')
@Index(['lab_id','date','period'], { unique: true }) // 防重复
@Index('idx_sessions_date', ['date'])                // 新增：按日期范围查询
@Index('idx_sessions_lab', ['lab_id'])              // 新增：按实验室查询
export class SessionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  lab_id!: number;

  @ManyToOne(() => LabEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lab_id' })
  lab!: LabEntity;

  @Column({ type: 'text' })
  date!: string; // YYYY-MM-DD

  @Column({ type: 'integer' })
  period!: number; // 1..8

  @Column({ type: 'text' })
  course!: string;

  @Column({ type: 'text' })
  teacher!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'integer' })
  planned!: number;

  @Column({ type: 'integer' })
  capacity!: number;

  @Column({ type: 'integer', default: 0 })
  allow_makeup!: 0 | 1;

  @Column({ type: 'integer', default: 2 })
  duration!: number; // 课时数，默认为2课时

  @Column({ type: 'text', nullable: true })
  class_names!: string | null; // 上课班级，如 "计算机1班,计算机2班" 或 "计算机1班、计算机2班"
}
