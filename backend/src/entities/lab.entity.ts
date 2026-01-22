// 功能：实验室信息实体。
import { Column, Entity, PrimaryColumn, Index } from 'typeorm';

@Entity('labs')
export class LabEntity {
  @PrimaryColumn({ type: 'integer' })
  id!: number; // 固定 ID（1..5）

  @Index({ unique: true })
  @Column({ type: 'text' })
  name!: string; // 如“西116”

  @Column({ type: 'integer' })
  capacity!: number;
}
