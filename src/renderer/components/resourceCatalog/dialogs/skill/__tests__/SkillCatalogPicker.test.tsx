import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type * as CherryStudioUi from '@cherrystudio/ui'
import { Dialog, DialogContent, DialogTitle } from '@cherrystudio/ui'
import type { InstalledSkill } from '@shared/data/types/agent'

import { SkillCatalogPicker } from '../SkillCatalogPicker'

vi.mock('@cherrystudio/ui', async (importOriginal) => importOriginal<typeof CherryStudioUi>())

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('../ImportSkillDialog', () => ({
  ImportSkillDialog: () => null
}))

vi.mock('../SkillMarketplaceDialog', () => ({
  SkillMarketplaceDialog: () => null
}))

vi.mock('../SystemSkillDialog', () => ({
  SystemSkillDialog: () => null
}))

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => {}
  }
  HTMLElement.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
})

function SkillPickerDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null)

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent ref={setPortalContainer} aria-describedby={undefined}>
        <DialogTitle>Edit Agent</DialogTitle>
        <div data-testid="dialog-blank-area">Blank area</div>
        <SkillCatalogPicker
          mode="edit"
          skills={[]}
          loading={false}
          selectedIds={[]}
          onSelectedIdsChange={() => {}}
          emptyLabel="No skills"
          portalContainer={portalContainer}
        />
      </DialogContent>
    </Dialog>
  )
}

describe('SkillCatalogPicker', () => {
  it('hides globally disabled skills from Agent selection and bulk enablement', async () => {
    const user = userEvent.setup()
    const onSelectedIdsChange = vi.fn()
    const enabledSkill = {
      id: 'enabled-skill',
      name: 'Enabled Skill',
      source: 'local',
      isGlobalEnabled: true
    } as InstalledSkill
    const disabledSkill = {
      id: 'disabled-skill',
      name: 'Disabled Skill',
      source: 'local',
      isGlobalEnabled: false
    } as InstalledSkill

    render(
      <SkillCatalogPicker
        mode="edit"
        skills={[enabledSkill, disabledSkill]}
        loading={false}
        selectedIds={[]}
        onSelectedIdsChange={onSelectedIdsChange}
        emptyLabel="No skills"
        portalContainer={null}
      />
    )

    expect(screen.getByText('Enabled Skill')).toBeInTheDocument()
    expect(screen.queryByText('Disabled Skill')).not.toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'library.config.agent.section.tools.skills_enable_all' }))
    expect(onSelectedIdsChange).toHaveBeenCalledWith(['enabled-skill'])
  })

  it('allows a saved builtin opt-out to be restored with the keyboard', async () => {
    const user = userEvent.setup()
    const builtinSkill = {
      id: 'builtin',
      name: 'Builtin Skill',
      source: 'builtin',
      isGlobalEnabled: true,
      isEnabled: false
    } as InstalledSkill

    function ExistingAgentSkills() {
      const [selectedIds, setSelectedIds] = useState<string[]>([])
      return (
        <SkillCatalogPicker
          mode="edit"
          skills={[builtinSkill]}
          loading={false}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          emptyLabel="No skills"
          portalContainer={null}
        />
      )
    }

    render(<ExistingAgentSkills />)
    const toggle = screen.getByRole('switch', { name: 'Builtin Skill' })
    expect(toggle).not.toBeChecked()
    expect(toggle).toBeEnabled()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard(' ')

    expect(toggle).toBeChecked()
    expect(toggle).toBeDisabled()
  })

  it('preserves selected globally disabled skills when toggling all visible skills', async () => {
    const user = userEvent.setup()
    const onSelectedIdsChange = vi.fn()
    const enabledSkill = {
      id: 'enabled-skill',
      name: 'Enabled Skill',
      source: 'local',
      isGlobalEnabled: true
    } as InstalledSkill
    const disabledSkill = {
      id: 'disabled-skill',
      name: 'Disabled Skill',
      source: 'local',
      isGlobalEnabled: false
    } as InstalledSkill

    function StatefulPicker() {
      const [selectedIds, setSelectedIds] = useState(['enabled-skill', 'disabled-skill'])

      return (
        <SkillCatalogPicker
          mode="edit"
          skills={[enabledSkill, disabledSkill]}
          loading={false}
          selectedIds={selectedIds}
          onSelectedIdsChange={(ids) => {
            onSelectedIdsChange(ids)
            setSelectedIds(ids)
          }}
          emptyLabel="No skills"
          portalContainer={null}
        />
      )
    }

    render(<StatefulPicker />)

    const bulkToggle = screen.getByRole('switch', {
      name: 'library.config.agent.section.tools.skills_enable_all'
    })
    await user.click(bulkToggle)
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['disabled-skill'])

    await user.click(bulkToggle)
    expect(onSelectedIdsChange).toHaveBeenLastCalledWith(['disabled-skill', 'enabled-skill'])
  })

  it('shows every globally enabled skill as enabled by default and locked during Agent creation', async () => {
    const user = userEvent.setup()
    const onSelectedIdsChange = vi.fn()
    const enabledSkill = {
      id: 'enabled-skill',
      name: 'Enabled Skill',
      source: 'local',
      isGlobalEnabled: true
    } as InstalledSkill
    const disabledSkill = {
      id: 'disabled-skill',
      name: 'Disabled Skill',
      source: 'local',
      isGlobalEnabled: false
    } as InstalledSkill

    render(
      <SkillCatalogPicker
        mode="create"
        skills={[enabledSkill, disabledSkill]}
        loading={false}
        selectedIds={[]}
        onSelectedIdsChange={onSelectedIdsChange}
        emptyLabel="No skills"
        portalContainer={null}
      />
    )

    const skillSwitch = screen.getByRole('switch', { name: 'Enabled Skill' })
    expect(skillSwitch).toBeChecked()
    expect(skillSwitch).toBeDisabled()
    expect(screen.queryByText('Disabled Skill')).not.toBeInTheDocument()

    const bulkToggle = screen.getByRole('switch', {
      name: 'library.config.agent.section.tools.skills_enable_all'
    })
    // Every listed skill is locked, so CapabilityList has no bulk-controllable items:
    // the shared enable-all switch is off and disabled.
    expect(bulkToggle).not.toBeChecked()
    expect(bulkToggle).toBeDisabled()

    await user.click(bulkToggle)
    expect(onSelectedIdsChange).not.toHaveBeenCalled()
  })

  it('dismisses the add menu without closing its parent dialog', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<SkillPickerDialog onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'library.skill_add.add' }))
    expect(screen.getByRole('menuitem', { name: 'library.skill_add.online_search' })).toBeInTheDocument()

    await user.click(screen.getByTestId('dialog-blank-area'))

    expect(screen.queryByRole('menuitem', { name: 'library.skill_add.online_search' })).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
