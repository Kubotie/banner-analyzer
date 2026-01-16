import { redirect } from 'next/navigation';

/**
 * ルートページ
 * デフォルトで/servicesにリダイレクト
 * サーバーコンポーネントとして実装（'use client'なし）
 */
export default function HomePage() {
  redirect('/services');
}
