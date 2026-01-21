import { Column, Entity, PrimaryColumn, Index } from 'typeorm';

@Entity('labs')
export class LabEntity {
  @PrimaryColumn({ type: 'integer' })
  id!: number; // 1..5 固定

  @Index({ unique: true })
  @Column({ type: 'text' })
  name!: string; // 西116...

  @Column({ type: 'integer' })
  capacity!: number;
}
