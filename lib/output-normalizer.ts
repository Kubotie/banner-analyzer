/**
 * フェーズ4: finalOutputのv1→v2正規化
 * 既存のv1構造をv2正規形に変換する互換関数
 */

import { PlanningArtifactV2 } from '../types/planning-artifact-v2';

/**
 * v1のfinalOutputをv2正規形に変換
 * @param finalOutput v1形式のfinalOutput（schemaVersionがない、または"1"）
 * @returns v2正規形のfinalOutput
 */
export function normalizeFinalOutputToV2(finalOutput: any): PlanningArtifactV2 {
  // nullやundefinedの場合は空のv2構造を返す
  if (!finalOutput || (typeof finalOutput !== 'object')) {
    return {
      schemaVersion: '2',
      core: {
        oneLiner: '',
        target: {},
        cv: {},
      },
      logic: {},
      deliverables: {},
    };
  }
  
  // 既にv2の場合はそのまま返す
  if (finalOutput?.schemaVersion === '2') {
    return finalOutput as PlanningArtifactV2;
  }

  // v1→v2変換
  const v2: PlanningArtifactV2 = {
    schemaVersion: '2',
    core: {
      oneLiner: finalOutput?.execSummary || finalOutput?.oneLiner || '',
      target: {
        situation: finalOutput?.targetUser?.situation,
        desire: finalOutput?.targetUser?.desire,
        anxiety: finalOutput?.targetUser?.anxiety,
        core: finalOutput?.targetUser?.core,
      },
      cv: {
        role: finalOutput?.finalCv?.role || finalOutput?.cvPolicy?.role,
        answers: finalOutput?.finalCv?.answers || finalOutput?.cvPolicy?.answers,
        keyPoints: finalOutput?.finalCv?.keyPoints || finalOutput?.cvPolicy?.keyPoints,
        ctaHint: finalOutput?.finalCv?.ctaHint || finalOutput?.cvPolicy?.ctaHint,
      },
    },
    logic: {
      story: finalOutput?.diagramHints,
    },
    deliverables: {},
  };

  // LP構造の変換
  if (finalOutput?.sections || finalOutput?.type === 'lp_structure') {
    v2.deliverables.lp = {
      sections: (finalOutput?.sections || []).map((section: any) => {
        // copyHintをcopy.headlineに移行（後方互換のため両方保持）
        const normalizedSection = {
          ...section,
          copyHint: section.copyHint || section.copy?.headline,
        };
        // copy.headlineが未設定の場合はcopyHintを使用
        if (!normalizedSection.copy?.headline && normalizedSection.copyHint) {
          normalizedSection.copy = {
            ...normalizedSection.copy,
            headline: normalizedSection.copyHint,
          };
        }
        return normalizedSection;
      }),
      questionCoverage: finalOutput?.questions || [],
      layoutHints: finalOutput?.diagramHints,
    };
  }

  // Banner構造の変換
  if (finalOutput?.bannerIdeas || finalOutput?.type === 'banner_structure') {
    v2.deliverables.banner = {
      bannerIdeas: finalOutput?.bannerIdeas || [],
      designNotes: finalOutput?.designNotes,
      lpSplit: finalOutput?.lpSplit,
    };
  }

  // その他のフィールドを保持（メタデータなど）
  const reservedKeys = [
    'schemaVersion',
    'execSummary',
    'targetUser',
    'finalCv',
    'cvPolicy',
    'sections',
    'questions',
    'diagramHints',
    'bannerIdeas',
    'designNotes',
    'lpSplit',
    'type',
  ];
  for (const key in finalOutput) {
    if (!reservedKeys.includes(key) && finalOutput[key] !== undefined) {
      (v2 as any)[key] = finalOutput[key];
    }
  }

  return v2;
}
