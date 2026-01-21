import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerEntity, BannerLevel } from './entities/banner.entity';

@Injectable()
export class AnnouncementService {
  constructor(@InjectRepository(BannerEntity) private repo: Repository<BannerEntity>) {}

  async get(): Promise<BannerEntity | null> {
    const row = await this.repo.findOneBy({ id: 1 });
    if (!row) return null;
    // 转换 visible、scrollable 和 scrollTime 字段
    return {
      ...row,
      visible: row.visible === 1,
      scrollable: row.scrollable === 1,
      scrollTime: row.scrollTime || 15
    } as BannerEntity & { visible: boolean; scrollable: boolean; scrollTime: number };
  }

  async put(body: { content: string; level: BannerLevel; expiresAt?: string | null; visible: boolean; scrollable: boolean; scrollTime: number; }) {
    // 允许空内容（用于取消横幅）
    if (!['info','warning','urgent'].includes(body.level)) {
      throw new BadRequestException('invalid banner level');
    }
    const rec: BannerEntity = {
      id: 1,
      content: String(body.content),
      level: body.level,
      expiresAt: body.expiresAt || null,
      visible: body.visible ? 1 : 0,
      scrollable: body.scrollable ? 1 : 0,
      scrollTime: body.scrollTime || 15
    };
    await this.repo.save(rec);
    return rec;
  }
}
