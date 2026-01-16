/**
 * PDF出力ユーティリティ
 * jspdfを使用してペルソナをPDF形式で出力
 */

// 動的インポート（クライアントサイドのみ）
export async function exportPersonaToPDF(persona: any): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('PDF出力はブラウザ環境でのみ利用可能です。');
  }

  try {
    // 動的インポート（jspdfがインストールされていない場合のエラーハンドリング）
    let jsPDF: any;
    try {
      const jspdfModule = await import('jspdf');
      jsPDF = jspdfModule.jsPDF || (jspdfModule as any).default;
      if (!jsPDF) {
        throw new Error('jspdfモジュールの読み込みに失敗しました。');
      }
    } catch (importError) {
      throw new Error('jspdfパッケージがインストールされていません。npm install jspdf を実行してください。');
    }
    const doc = new jsPDF();

    // フォントサイズとマージン設定
    const margin = 20;
    let yPos = margin;
    const lineHeight = 7;
    const fontSize = 12;
    const titleFontSize = 16;

    // タイトル
    doc.setFontSize(titleFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text('ペルソナ情報', margin, yPos);
    yPos += lineHeight * 2;

    // 仮説ペルソナラベル
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(200, 150, 0);
    doc.text('※仮説ペルソナ（一次情報に基づく現時点の判断）', margin, yPos);
    yPos += lineHeight * 1.5;
    doc.setTextColor(0, 0, 0);

    // 1行要約
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    doc.text('【1行要約】', margin, yPos);
    yPos += lineHeight;
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(persona.summary || persona.one_line_summary || '情報不足', 170);
    doc.text(summaryLines, margin, yPos);
    yPos += summaryLines.length * lineHeight + lineHeight;

    // 背景ストーリー
    doc.setFont('helvetica', 'bold');
    doc.text('【背景ストーリー】', margin, yPos);
    yPos += lineHeight;
    doc.setFont('helvetica', 'normal');
    const storyLines = doc.splitTextToSize(persona.story || persona.background_story || '情報不足', 170);
    doc.text(storyLines, margin, yPos);
    yPos += storyLines.length * lineHeight + lineHeight;

    // 購入の構造
    if (persona.proxy_structure || persona.proxy_purchase_structure) {
      const structure = persona.proxy_structure || persona.proxy_purchase_structure;
      doc.setFont('helvetica', 'bold');
      doc.text('【購入の構造】', margin, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text(`誰の課題: ${structure.whose_problem || '情報不足'}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`誰が解決: ${structure.who_solves || '情報不足'}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`どう解決: ${structure.how || '情報不足'}`, margin, yPos);
      yPos += lineHeight * 1.5;
    }

    // JTBD
    if (persona.jtbd || persona.job_to_be_done) {
      const jtbd = persona.jtbd || persona.job_to_be_done;
      doc.setFont('helvetica', 'bold');
      doc.text('【JTBD】', margin, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      if (jtbd.functional && jtbd.functional.length > 0) {
        doc.text(`機能: ${jtbd.functional.join(', ')}`, margin, yPos);
        yPos += lineHeight;
      }
      if (jtbd.emotional && jtbd.emotional.length > 0) {
        doc.text(`感情: ${jtbd.emotional.join(', ')}`, margin, yPos);
        yPos += lineHeight;
      }
      if (jtbd.social && jtbd.social.length > 0) {
        doc.text(`社会: ${jtbd.social.join(', ')}`, margin, yPos);
        yPos += lineHeight;
      }
      yPos += lineHeight;
    }

    // 判断基準TOP5
    if (persona.decision_criteria_top5 && persona.decision_criteria_top5.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('【判断基準TOP5】', margin, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      persona.decision_criteria_top5.forEach((item: any, idx: number) => {
        doc.text(`${idx + 1}. ${item.criterion} (重み: ${(item.weight * 100).toFixed(0)}%)`, margin, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight;
    }

    // 典型ジャーニー
    if (persona.journey || persona.typical_journey) {
      const journey = persona.journey || persona.typical_journey;
      doc.setFont('helvetica', 'bold');
      doc.text('【典型ジャーニー】', margin, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text(`きっかけ: ${journey.trigger || '情報不足'}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`検討: ${journey.consider || journey.consideration || '情報不足'}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`購入: ${journey.purchase || '情報不足'}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`継続: ${journey.continue || journey.retention || '情報不足'}`, margin, yPos);
      yPos += lineHeight * 1.5;
    }

    // 誤解しやすいポイント
    if (persona.pitfalls && persona.pitfalls.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('【誤解しやすいポイント】', margin, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      persona.pitfalls.forEach((pitfall: string) => {
        const lines = doc.splitTextToSize(`• ${pitfall}`, 170);
        doc.text(lines, margin, yPos);
        yPos += lines.length * lineHeight;
      });
      yPos += lineHeight;
    }

    // 有効な施策
    if (persona.tactics || persona.effective_strategies) {
      const tactics = persona.tactics || persona.effective_strategies;
      doc.setFont('helvetica', 'bold');
      doc.text('【有効な施策】', margin, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      if (tactics.message && tactics.message.length > 0) {
        doc.text('メッセージ:', margin, yPos);
        yPos += lineHeight;
        tactics.message.forEach((msg: string) => {
          const lines = doc.splitTextToSize(`  • ${msg}`, 170);
          doc.text(lines, margin, yPos);
          yPos += lines.length * lineHeight;
        });
      }
      if (tactics.route && tactics.route.length > 0) {
        doc.text('導線:', margin, yPos);
        yPos += lineHeight;
        tactics.route.forEach((route: string) => {
          const lines = doc.splitTextToSize(`  • ${route}`, 170);
          doc.text(lines, margin, yPos);
          yPos += lines.length * lineHeight;
        });
      }
      if (tactics.offer && tactics.offer.length > 0) {
        doc.text('オファー:', margin, yPos);
        yPos += lineHeight;
        tactics.offer.forEach((offer: string) => {
          const lines = doc.splitTextToSize(`  • ${offer}`, 170);
          doc.text(lines, margin, yPos);
          yPos += lines.length * lineHeight;
        });
      }
      yPos += lineHeight;
    }

    // Evidence
    if (persona.evidence) {
      doc.setFont('helvetica', 'bold');
      doc.text('【Evidence】', margin, yPos);
      yPos += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text(`引用件数: ${persona.evidence.count || 0}件`, margin, yPos);
      yPos += lineHeight * 1.5;
    }

    // ファイル名を生成
    const fileName = `${persona.title || 'persona'}.pdf`;

    // PDFをダウンロード
    doc.save(fileName);
  } catch (error) {
    console.error('PDF出力エラー:', error);
    throw new Error(`PDF出力に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}
