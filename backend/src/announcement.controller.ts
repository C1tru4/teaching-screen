// 功能：公告与横幅相关接口。
import { Body, Controller, Get, Put } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { BannerLevel } from './entities/banner.entity';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly svc: AnnouncementService) {}

  /** 获取顶部横幅（可能为 null） */
  @Get('banner')
  getBanner() {
    return this.svc.get();
  }

  /** 设置/更新顶部横幅 */
  @Put('banner')
  putBanner(
    @Body()
    body: { content: string; level: BannerLevel; expiresAt: string; visible: boolean; scrollable: boolean; scrollTime: number }
  ) {
    return this.svc.put(body);
  }
}
