/**
 * CommunicationGuide — "순항하는 대화" / "좌초하는 대화"
 *
 * 결과 페이지 컴포넌트. 다른 사람이 "이 유형의 나에게" 어떻게 다가오면 좋은지를 안내한다.
 */

import { TYPE_PROFILES } from '@/data/type-profiles';
import { SAIL_TYPES, type SailType } from '@/types/sail';

interface CommunicationGuideProps {
  dominantType: SailType;
}

export function CommunicationGuide({ dominantType }: CommunicationGuideProps) {
  const profile = TYPE_PROFILES[dominantType];
  const info = SAIL_TYPES[dominantType];

  return (
    <section className="rounded-card border border-sail-gray-200 bg-white p-card shadow-card">
      <h2 className="mb-1 text-h3 font-bold text-sail-navy">소통 가이드</h2>
      <p className="mb-5 text-bodySm text-sail-gray-600">
        {info.koreanName}({dominantType}형)인 당신과 잘 소통하는 법
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 순항하는 대화 */}
        <div className="rounded-card border border-emerald-200 bg-emerald-50/60 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-h4 font-bold text-emerald-900">
            <span>🌤️</span>
            순항하는 대화
          </h3>
          <ul className="space-y-2 text-bodySm text-emerald-900">
            {profile.smoothTalk.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-0.5 text-emerald-600">●</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 좌초하는 대화 */}
        <div className="rounded-card border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-h4 font-bold text-amber-900">
            <span>🌧️</span>
            좌초하는 대화
          </h3>
          <ul className="space-y-2 text-bodySm text-amber-900">
            {profile.rockyTalk.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-0.5 text-amber-600">●</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 rounded-alert border-l-4 border-sail-info bg-sky-50 px-4 py-3 text-bodySm text-sky-900">
        💡 이 표를 동료·가족·친구에게 공유해 보세요. "나는 이런 사람"이라는 사용설명서가 됩니다.
      </p>
    </section>
  );
}
