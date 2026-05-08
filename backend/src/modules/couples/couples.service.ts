import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Couple, CoupleDocument } from '../../common/schemas/couple.schema';
import { User, UserDocument } from '../../common/schemas/user.schema';

@Injectable()
export class CouplesService {
  constructor(
    @InjectModel(Couple.name) private readonly coupleModel: Model<CoupleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private async ensureSingleConnectionLimit(userId: string, excludeCoupleId?: string) {
    const query: Record<string, unknown> = {
      $or: [{ userAId: new Types.ObjectId(userId) }, { userBId: new Types.ObjectId(userId) }],
      status: { $in: ['pending', 'accepted'] },
      expiresAt: { $gt: new Date() },
    };
    if (excludeCoupleId) {
      query._id = { $ne: new Types.ObjectId(excludeCoupleId) };
    }
    const existing = await this.coupleModel.findOne(query);
    if (existing) {
      throw new BadRequestException('Only one active/pending couple connection is allowed');
    }
  }

  async invite(userId: string, partnerEmail: string) {
    const owner = await this.userModel.findById(userId).lean();
    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    const partner = await this.userModel.findOne({ email: partnerEmail.toLowerCase() }).lean();
    if (!partner) {
      throw new NotFoundException('Partner user not found');
    }
    if (String(partner._id) === userId) {
      throw new BadRequestException('Cannot invite yourself');
    }
    await this.ensureSingleConnectionLimit(userId);
    await this.ensureSingleConnectionLimit(String(partner._id));

    const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    const couple = await this.coupleModel.create({
      userAId: new Types.ObjectId(userId),
      userBId: partner._id,
      requestedByUserId: new Types.ObjectId(userId),
      targetUserId: partner._id,
      inviteCode,
      status: 'pending',
      expiresAt,
    });
    return {
      message: 'Invite created and waiting for approval',
      inviteCode: couple.inviteCode,
      coupleId: couple.id,
      status: couple.status,
      expiresAt: couple.expiresAt,
    };
  }

  async connect(userId: string, inviteCode: string) {
    const couple = await this.coupleModel.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!couple) {
      throw new NotFoundException('Invite code not found');
    }
    if (couple.status !== 'pending') {
      throw new BadRequestException('Invite is no longer pending');
    }
    if (couple.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invite has expired');
    }
    if (String(couple.targetUserId) !== userId) {
      throw new ForbiddenException('Only invited partner can approve this request');
    }
    await this.ensureSingleConnectionLimit(String(couple.userAId), couple.id);
    await this.ensureSingleConnectionLimit(String(couple.userBId), couple.id);
    couple.status = 'accepted';
    await couple.save();
    return {
      message: 'Couple connected',
      coupleId: couple.id,
      status: couple.status,
    };
  }

  async getIncomingRequests(userId: string) {
    const requests = await this.coupleModel
      .find({
        targetUserId: new Types.ObjectId(userId),
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
      .populate('requestedByUserId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    return { requests };
  }

  async approveRequest(userId: string, coupleId: string) {
    const couple = await this.coupleModel.findById(coupleId);
    if (!couple) throw new NotFoundException('Request not found');
    if (String(couple.targetUserId) !== userId) {
      throw new ForbiddenException('Only invited partner can approve');
    }
    if (couple.status !== 'pending') {
      throw new BadRequestException('Request is no longer pending');
    }
    await this.ensureSingleConnectionLimit(String(couple.userAId), couple.id);
    await this.ensureSingleConnectionLimit(String(couple.userBId), couple.id);
    couple.status = 'accepted';
    await couple.save();
    return { message: 'Request approved', coupleId: couple.id, status: couple.status };
  }

  async rejectRequest(userId: string, coupleId: string) {
    const couple = await this.coupleModel.findById(coupleId);
    if (!couple) throw new NotFoundException('Request not found');
    if (String(couple.targetUserId) !== userId) {
      throw new ForbiddenException('Only invited partner can reject');
    }
    if (couple.status !== 'pending') {
      throw new BadRequestException('Request is no longer pending');
    }
    couple.status = 'rejected';
    await couple.save();
    return { message: 'Request rejected', coupleId: couple.id, status: couple.status };
  }

  async getMyPartner(userId: string) {
    const couple = await this.coupleModel
      .findOne({
        $or: [{ userAId: new Types.ObjectId(userId) }, { userBId: new Types.ObjectId(userId) }],
        status: 'accepted',
      })
      .lean();
    if (!couple) {
      return { connected: false, partner: null };
    }

    const partnerId =
      String(couple.userAId) === userId ? String(couple.userBId) : String(couple.userAId);
    const partner = await this.userModel
      .findById(partnerId)
      .select({ name: 1, email: 1, role: 1 })
      .lean();

    return {
      connected: true,
      coupleId: String(couple._id),
      status: couple.status,
      partner: partner
        ? {
            id: String(partner._id),
            name: partner.name,
            email: partner.email,
            role: partner.role,
          }
        : null,
    };
  }

  async disconnect(userId: string) {
    const couple = await this.coupleModel.findOne({
      $or: [{ userAId: new Types.ObjectId(userId) }, { userBId: new Types.ObjectId(userId) }],
      status: 'accepted',
    });
    if (!couple) {
      throw new NotFoundException('No active couple connection found');
    }
    couple.status = 'cancelled';
    await couple.save();
    return { message: 'Couple connection removed', coupleId: couple.id, status: couple.status };
  }
}
