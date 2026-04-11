import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  async getMyOpportunities(@Req() req: any) {
    const user = req.user;
    if (!user.companyId) {
        return [];
    }
    return this.opportunitiesService.getOpportunitiesForCompany(user.companyId);
  }
}
