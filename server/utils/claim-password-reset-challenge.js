async function claimPasswordResetChallenge(EmailChallenge, email, userId, now = new Date()) {
  return EmailChallenge.findOneAndDelete({
    email,
    userId,
    purpose: 'password-reset',
    expiresAt: { $gt: now },
    verifiedAt: { $exists: true },
  });
}

module.exports = claimPasswordResetChallenge;
