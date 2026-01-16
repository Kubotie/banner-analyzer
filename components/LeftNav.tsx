'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FolderOpen, Users, Image, BookOpen, Workflow } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * 左ナビゲーション（メインカテゴリのみ）
 * 「何を扱うアプリか（ドメイン）」を切り替える
 */
export default function LeftNav() {
  const pathname = usePathname();

  // メニューセクション（4カテゴリのみ）
  const menuSections: NavSection[] = [
    {
      title: 'サービス・製品',
      items: [
        { 
          label: 'サービス・製品', 
          path: '/services',
          icon: <FolderOpen className="w-4 h-4" />
        },
      ],
    },
    {
      title: 'ペルソナ',
      items: [
        { 
          label: '登録・更新・AI分析', 
          path: '/personas',
          icon: <Users className="w-4 h-4" />
        },
        { 
          label: '履歴', 
          path: '/personas/history',
          icon: <Users className="w-4 h-4" />
        },
        { 
          label: 'ペルソナ一覧', 
          path: '/personas/list',
          icon: <Users className="w-4 h-4" />
        },
      ],
    },
    {
      title: 'バナー分析',
      items: [
        { 
          label: '画像読み込み・AI分析', 
          path: '/banners',
          icon: <Image className="w-4 h-4" />
        },
        { 
          label: '履歴', 
          path: '/banners/history',
          icon: <Image className="w-4 h-4" />
        },
        { 
          label: '保存画像一覧', 
          path: '/banners/images',
          icon: <Image className="w-4 h-4" />
        },
      ],
    },
    {
      title: 'ナレッジベース',
      items: [
        { 
          label: 'ナレッジベース', 
          path: '/knowledge',
          icon: <BookOpen className="w-4 h-4" />
        },
      ],
    },
    {
      title: 'ワークフロー',
      items: [
        { 
          label: 'ワークフロー', 
          path: '/workflow',
          icon: <Workflow className="w-4 h-4" />
        },
      ],
    },
  ];

  // パスを正規化（末尾のスラッシュを削除）
  const normalizePath = (path: string): string => {
    return path.replace(/\/$/, '') || '/';
  };

  const currentPath = normalizePath(pathname);

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-6">
          {menuSections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item, itemIdx) => {
                  const itemPath = normalizePath(item.path);
                  const isActive = currentPath === itemPath || currentPath.startsWith(itemPath + '/');
                  
                  return (
                    <Link
                      key={itemIdx}
                      href={item.path}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
