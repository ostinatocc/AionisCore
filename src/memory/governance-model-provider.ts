export type GovernanceReviewResolver<TPacket, TReview> = (args: {
  reviewPacket: TPacket;
  suppliedReviewResult: TReview | null;
}) => TReview | null | Promise<TReview | null>;

export type GovernanceReviewProvider<TPacket, TReview> = {
  resolveReviewResult: GovernanceReviewResolver<TPacket, TReview>;
};
