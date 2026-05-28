/**
 * ProfileDetail — 강점·그림자·순풍·역풍·핵심 동기·대표 문장·항해 속 모습
 */

import { TYPE_PROFILES } from '@/data/type-profiles';
import { SAIL_TYPES, type SailType } from '@/types/sail';

interface ProfileDetailProps {
  dominantType: SailType;
}

const TYPE_TEXT_CLASS: Record<SailType, string> = {
  S: 'text-sail-s',
  A: 'text-sail-a',
  I: 'text-sail-i',
  L: 'text-sail-l',
};

const TYPE_BG_TINT_CLASS: Record<SailType, string> = {
  S: 'bg-[color:var(--color-sail-s-tint)]',
  A: 'bg-[color:var(--color-sail-a-tint)]',
  I: 'bg-[color:var(--color-sail-i-tint)]',
  L: 'bg-[color:var(--color-sail-l-tint)]',
};

export function ProfileDetail({ dominantType }: ProfileDetailProps) {
  const profile = TYPE_PROFILES[dominantType];
  const info = SAIL_TYPES[dominantType];

  return (
    <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <h2 className="mb-1 text-h3 font-bold text-sail-navy">항해 프로필</h2>
      <p className="mb-6 text-bodySm text-sail-gray-600">
        {info.koreanName}({dominantType}형)이 잘 작동할 때와 흔들릴 때
      </p>

      {/* 핵심 동기 + 대표 문장 */}
      <div
        className={`mb-6 rounded-card border-l-4 border-current ${TYPE_BG_TINT_CLASS[dominantType]} ${TYPE_TEXT_CLASS[dominantType]} px-5 py-4`}
      >
        <p className="text-tiny font-semibold uppercase tracking-wide opacity-80">
          핵심 동기
        </p>
        <p className="text-body font-bold">{profile.coreMotive}</p>
        <p className="mt-2 text-body italic">{profile.signaturePhrase}</p>
      </div>

      {/* 강점·그림자 2단 */}
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-h4 font-bold text-sail-gray-900">
            💪 강점
          </h3>
          <ul className="space-y-1.5 text-bodySm text-sail-gray-700">
            {profile.strengths.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-sail-success">●</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-h4 font-bold text-sail-gray-900">
            🌑 그림자
          </h3>
          <ul className="space-y-1.5 text-bodySm text-sail-gray-700">
            {profile.shadows.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-sail-warning">●</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 순풍 · 역풍 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-sail-gray-200 bg-sail-gray-50 p-5">
          <h3 className="mb-2 text-bodySm font-semibold uppercase tracking-wide text-sail-success">
            🌤️ 순풍 (잘 작동할 때)
          </h3>
          <p className="text-body leading-relaxed text-sail-gray-800">
            {profile.fairWind}
          </p>
        </div>
        <div className="rounded-card border border-sail-gray-200 bg-sail-gray-50 p-5">
          <h3 className="mb-2 text-bodySm font-semibold uppercase tracking-wide text-sail-warning">
            🌧️ 역풍 (스트레스 받을 때)
          </h3>
          <p className="text-body leading-relaxed text-sail-gray-800">
            {profile.headWind}
          </p>
        </div>
      </div>

      {/* 항해 속 모습 */}
      <div className="mt-6 rounded-card border border-sail-gray-200 bg-sail-navy-bg p-5">
        <h3 className="mb-2 text-bodySm font-semibold uppercase tracking-wide text-sail-navy">
          ⛵ 항해 속 모습
        </h3>
        <p className="text-body leading-relaxed text-sail-gray-800">
          {profile.inVoyage}
        </p>
      </div>
    </section>
  );
}
