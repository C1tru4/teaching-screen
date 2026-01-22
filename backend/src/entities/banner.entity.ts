// 功能：横幅公告数据实体。
import { Column, Entity, PrimaryColumn } from 'typeorm';

export type BannerLevel = 'info'|'warning'|'urgent';

@Entity('banner')
export class BannerEntity {
  @PrimaryColumn({ type: 'integer' })
  id!: number; // 固定 1

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text' })
  level!: BannerLevel;

  @Column({ type: 'text', nullable: true })
  expiresAt!: string | null; // ISO8601

  @Column({ type: 'integer', default: 1 })
  visible!: 0 | 1;

  @Column({ type: 'integer', default: 0 })
  scrollable!: 0 | 1;

  @Column({ type: 'integer', default: 15 })
  scrollTime!: number; // 滚动时间（秒）
}
