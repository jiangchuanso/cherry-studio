import { FolderSearch, Import, Search, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { InstalledSkill } from '@shared/data/types/agent'

import { CapabilityIconTile, type CapabilityItem, CapabilityList } from '../components/CapabilityList'
import { ImportSkillDialog } from './ImportSkillDialog'
import { SkillMarketplaceDialog } from './SkillMarketplaceDialog'
import { SystemSkillDialog } from './SystemSkillDialog'

type SkillCatalogPickerProps = {
  mode: 'create' | 'edit'
  skills: InstalledSkill[]
  loading: boolean
  selectedIds: readonly string[]
  onSelectedIdsChange: (ids: string[]) => void
  emptyLabel: ReactNode
  portalContainer: HTMLElement | null
  disabled?: boolean
}

const skillIcon = (
  <CapabilityIconTile>
    <Zap size={13} strokeWidth={1.6} />
  </CapabilityIconTile>
)

/**
 * Every installed skill defaults to on for a new Agent — `AgentGlobalSkillService.list()`
 * treats a skill with no explicit `agent_skill` row as enabled — so the create wizard shows
 * all of them checked and locked. An existing Agent can restore a previously disabled builtin.
 */
export function SkillCatalogPicker({
  mode,
  skills,
  loading,
  selectedIds,
  onSelectedIdsChange,
  emptyLabel,
  portalContainer,
  disabled = false
}: SkillCatalogPickerProps) {
  const { t } = useTranslation()
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [systemSkillOpen, setSystemSkillOpen] = useState(false)
  const availableSkills = useMemo(() => skills.filter((skill) => skill.isGlobalEnabled), [skills])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])

  const items = useMemo<CapabilityItem[]>(
    () =>
      availableSkills.map((skill) => {
        const builtin = skill.source === 'builtin'
        return {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          icon: skillIcon,
          // fork 定制：create 模式下所有已安装 skill 默认启用且不可关闭，skillIds 保持为空。
          locked: mode === 'create' || (builtin && selected.has(skill.id)),
          badge: mode === 'create' || builtin ? t('library.config.dialogs.create.capability.builtin_badge') : undefined
        }
      }),
    [availableSkills, mode, selected, t]
  )
  const changeSelection = (ids: string[]) => {
    if (mode === 'edit') return onSelectedIdsChange(ids)
    const selectable = new Set(items.filter((item) => !item.locked).map((item) => item.id))
    onSelectedIdsChange(ids.filter((id) => selectable.has(id)))
  }

  return (
    <CapabilityList
      items={items}
      selectedIds={selectedIds}
      onSelectedIdsChange={changeSelection}
      searchPlaceholder={t('library.config.dialogs.create.capability.search')}
      addLabel={t('library.skill_add.add')}
      addActions={[
        {
          id: 'online',
          label: t('library.skill_add.online_search'),
          icon: <Search />,
          onSelect: () => setMarketplaceOpen(true)
        },
        {
          id: 'import',
          label: t('library.skill_add.local_import'),
          icon: <Import />,
          onSelect: () => setImportOpen(true)
        },
        {
          id: 'system',
          label: t('library.skill_add.system_search'),
          icon: <FolderSearch />,
          onSelect: () => setSystemSkillOpen(true)
        }
      ]}
      emptyLabel={emptyLabel}
      portalContainer={portalContainer}
      loading={loading}
      disabled={disabled}>
      <SkillMarketplaceDialog open={marketplaceOpen} onOpenChange={setMarketplaceOpen} />
      <ImportSkillDialog open={importOpen} onOpenChange={setImportOpen} />
      <SystemSkillDialog
        mode="agent-create"
        open={systemSkillOpen}
        onOpenChange={setSystemSkillOpen}
        selectedSkillIds={selectedIds}
        onEnabled={(skillId) => onSelectedIdsChange(Array.from(new Set([...selectedIds, skillId])))}
      />
    </CapabilityList>
  )
}
