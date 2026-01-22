// 功能：项目数据实体。
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
export type ProjectStatus = 'reviewing' | 'ongoing' | 'done';

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) title!: string;
  @Column({ type: 'text' }) mentor!: string;
  @Column({ type: 'integer', default: 0 }) member_count!: number;
  @Column({ type: 'text', default: 'reviewing' }) status!: ProjectStatus;
  @Column({ type: 'integer' }) year!: number;
  @Column({ type: 'boolean', default: false }) excellent!: boolean;
  @Column({ type: 'text', nullable: true }) cover_url!: string | null;
  @Column({ type: 'text', nullable: true }) students_json!: string | null; // JSON 字符串
  @Column({ type: 'text', default: '' }) description!: string;
  
  // 扩展信息
  @Column({ type: 'text', nullable: true }) team_members_json!: string | null; // 团队成员 JSON 数组（首项为队长）
  @Column({ type: 'text', nullable: true }) paper_url!: string | null; // 论文文件 URL
  @Column({ type: 'text', nullable: true }) paper_filename!: string | null; // 论文原始文件名
  @Column({ type: 'text', nullable: true }) video_url!: string | null; // 视频文件 URL
  @Column({ type: 'text', nullable: true }) video_filename!: string | null; // 视频原始文件名
  @Column({ type: 'datetime', nullable: true }) project_start_date!: string | null; // 立项时间
  @Column({ type: 'datetime', nullable: true }) project_end_date!: string | null; // 完成时间
  
  @CreateDateColumn({ type: 'datetime' }) created_at!: string;
  @UpdateDateColumn({ type: 'datetime' }) updated_at!: string;
}
