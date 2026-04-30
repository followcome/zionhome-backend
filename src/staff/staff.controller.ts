import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffService } from './staff.service';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('dashboard')
  async getDashboard(@Request() req: { user: { id: number } }) {
    return this.staffService.getDashboard(req.user.id);
  }

  @Get('profile')
  async getProfile(@Request() req: { user: { id: number } }) {
    return this.staffService.getProfile(req.user.id);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req: { user: { id: number } },
    @Body() body: any,
  ) {
    return this.staffService.updateProfile(req.user.id, body);
  }

  @Get('attendance')
  async getAttendance(
    @Request() req: { user: { id: number } },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const filters = {
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    };

    return this.staffService.getAttendance(req.user.id, filters);
  }

  @Post('leaves/request')
  async requestLeave(
    @Request() req: { user: { id: number } },
    @Body() body: any,
  ) {
    return this.staffService.requestLeave(req.user.id, body);
  }

  @Get('leaves')
  async getLeaves(
    @Request() req: { user: { id: number } },
    @Query('status') status?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const filters = {
      status,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    };

    return this.staffService.getLeaves(req.user.id, filters);
  }

  @Get('leaves/balance')
  async getLeaveBalance(@Request() req: { user: { id: number } }) {
    return this.staffService.getLeaveBalance(req.user.id);
  }

  @Get('leaves/calendar')
  async getLeaveCalendar(
    @Request() req: { user: { id: number } },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const filters = {
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
    };

    return this.staffService.getLeaveCalendar(req.user.id, filters);
  }

  @Get('salaries')
  async getSalaries(@Request() req: { user: { id: number } }) {
    return this.staffService.getSalaries(req.user.id);
  }

  @Get('salaries/history')
  async getSalaryHistory(
    @Request() req: { user: { id: number } },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const filters = {
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    };

    return this.staffService.getSalaryHistory(req.user.id, filters);
  }

  @Get('documents')
  async getDocuments(@Request() req: { user: { id: number } }) {
    return this.staffService.getDocuments(req.user.id);
  }

  @Get('documents/:id')
  async getDocumentById(
    @Request() req: { user: { id: number } },
    @Param('id') id: string,
  ) {
    return this.staffService.getDocumentById(req.user.id, id);
  }

  @Get('assets')
  async getAssets(@Request() req: { user: { id: number } }) {
    return this.staffService.getAssets(req.user.id);
  }

  @Get('assets/:id')
  async getAssetById(
    @Request() req: { user: { id: number } },
    @Param('id') id: string,
  ) {
    return this.staffService.getAssetById(req.user.id, id);
  }

  @Get('notifications')
  async getNotifications(@Request() req: { user: { id: number } }) {
    return this.staffService.getNotifications(req.user.id);
  }

  @Get('activities')
  async getActivities(@Request() req: { user: { id: number } }) {
    return this.staffService.getActivities(req.user.id);
  }

  @Post('activities')
  async createActivity(
    @Request() req: { user: { id: number } },
    @Body() body: any,
  ) {
    return this.staffService.createActivity(req.user.id, body);
  }

  @Patch('settings/password')
  async updatePassword(
    @Request() req: { user: { id: number } },
    @Body() body: any,
  ) {
    return this.staffService.updatePassword(req.user.id, body);
  }

  @Post('logout')
  async logout(@Request() req: { user: { id: number } }) {
    return this.staffService.logout(req.user.id);
  }
}
