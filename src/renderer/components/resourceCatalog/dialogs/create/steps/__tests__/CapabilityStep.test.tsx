import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InstalledSkill } from '@shared/types/skill'

import type { ResourceCreateWizardFormValues } from '../../types'
import { CapabilityStep } from '../CapabilityStep'

const { importSkillDialogState, installedSkillsState, marketplaceDialogState, systemSkillDialogState } = vi.hoisted(
  () => ({
    importSkillDialogState: {
      current: null as null | {
        open: boolean
        onOpenChange: (open: boolean) => void
      }
    },
    marketplaceDialogState: {
      current: null as null | {
        open: boolean
        onOpenChange: (open: boolean) => void
      }
    },
    installedSkillsState: {
      skills: [
        { id: 'skill-a', name: 'Alpha Skill', source: 'local', isGlobalEnabled: true },
        { id: 'skill-b', name: 'Beta Skill', source: 'local', isGlobalEnabled: true },
        { id: 'skill-builtin', name: 'Builtin Skill', source: 'builtin', isGlobalEnabled: true }
      ] as InstalledSkill[]
    },
    systemSkillDialogState: {
      current: null as null | {
        open: boolean
        onOpenChange: (open: boolean) => void
        mode: 'manage' | 'agent-create'
        onEnabled?: (skillId: string) => void
        selectedSkillIds?: readonly string[]
      }
    }
  })
)

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('@renderer/hooks/useSkills', () => ({
  useReconcileSkillsOnOpen: vi.fn(),
  useInstalledSkills: () => ({
    skills: installedSkillsState.skills,
    loading: false
  })
}))

vi.mock('@renderer/components/resourceCatalog/dialogs/skill/ImportSkillDialog', () => ({
  ImportSkillDialog: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    importSkillDialogState.current = props
    return props.open ? <div>Skill import dialog</div> : null
  }
}))

vi.mock('@renderer/components/resourceCatalog/dialogs/skill/SkillMarketplaceDialog', () => ({
  SkillMarketplaceDialog: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    marketplaceDialogState.current = props
    return props.open ? <div>Skill marketplace dialog</div> : null
  }
}))

vi.mock('@renderer/components/resourceCatalog/dialogs/skill/SystemSkillDialog', () => ({
  SystemSkillDialog: (props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: 'manage' | 'agent-create'
    onEnabled?: (skillId: string) => void
    selectedSkillIds?: readonly string[]
  }) => {
    systemSkillDialogState.current = props
    return props.open ? <div>System skill dialog</div> : null
  }
}))

function CapabilityStepHarness() {
  const form = useForm<ResourceCreateWizardFormValues>({
    defaultValues: {
      avatar: '🤖',
      name: '',
      description: '',
      agentType: 'claude-code',
      permissionMode: 'default',
      modelId: null,
      prompt: '',
      knowledgeBaseIds: [],
      skillIds: []
    }
  })

  return (
    <>
      <CapabilityStep form={form} portalContainer={null} />
      <output data-testid="skill-ids">{form.watch('skillIds').join(',')}</output>
    </>
  )
}

describe('CapabilityStep', () => {
  beforeEach(() => {
    installedSkillsState.skills = [
      { id: 'skill-a', name: 'Alpha Skill', source: 'local', isGlobalEnabled: true },
      { id: 'skill-b', name: 'Beta Skill', source: 'local', isGlobalEnabled: true },
      { id: 'skill-builtin', name: 'Builtin Skill', source: 'builtin', isGlobalEnabled: true }
    ] as InstalledSkill[]
    importSkillDialogState.current = null
    marketplaceDialogState.current = null
    systemSkillDialogState.current = null
  })

  it('shows every installed skill pre-checked and locked, and never adds them to skillIds', async () => {
    const user = userEvent.setup()
    render(<CapabilityStepHarness />)

    const alphaSkill = screen.getByRole('checkbox', { name: 'Alpha Skill' })
    const betaSkill = screen.getByRole('checkbox', { name: 'Beta Skill' })
    const builtinSkill = screen.getByRole('checkbox', { name: 'Builtin Skill' })

    expect(alphaSkill).toBeChecked()
    expect(alphaSkill).toBeDisabled()
    expect(betaSkill).toBeChecked()
    expect(betaSkill).toBeDisabled()
    expect(builtinSkill).toBeChecked()
    expect(builtinSkill).toBeDisabled()

    await user.click(builtinSkill)
    expect(builtinSkill).toBeChecked()

    await user.click(alphaSkill)
    expect(alphaSkill).toBeChecked()
    expect(screen.getByTestId('skill-ids').textContent).toBe('')
  })

  it('locks the bulk toggle because every installed skill is already enabled', async () => {
    const user = userEvent.setup()
    render(<CapabilityStepHarness />)

    const selectAllSwitch = screen.getByRole('switch', {
      name: 'library.config.agent.section.tools.skills_enable_all'
    })
    expect(selectAllSwitch).toBeChecked()
    expect(selectAllSwitch).toBeDisabled()

    await user.click(selectAllSwitch)
    expect(selectAllSwitch).toBeChecked()
    expect(screen.getByTestId('skill-ids').textContent).toBe('')
  })

  it('opens the skill import dialog', async () => {
    const user = userEvent.setup()
    render(<CapabilityStepHarness />)

    await user.click(screen.getByRole('button', { name: 'library.skill_add.add' }))
    await user.click(screen.getByRole('button', { name: 'library.skill_add.local_import' }))
    expect(importSkillDialogState.current?.open).toBe(true)
  })

  it('opens online skill search', async () => {
    const user = userEvent.setup()
    render(<CapabilityStepHarness />)

    await user.click(screen.getByRole('button', { name: 'library.skill_add.add' }))
    await user.click(screen.getByRole('button', { name: 'library.skill_add.online_search' }))
    expect(marketplaceDialogState.current?.open).toBe(true)
  })

  it('enables an imported system skill for the new agent selection', async () => {
    const user = userEvent.setup()
    render(<CapabilityStepHarness />)

    await user.click(screen.getByRole('button', { name: 'library.skill_add.add' }))
    await user.click(screen.getByRole('button', { name: 'library.skill_add.system_search' }))
    expect(systemSkillDialogState.current?.open).toBe(true)
    expect(systemSkillDialogState.current?.mode).toBe('agent-create')

    act(() => systemSkillDialogState.current?.onEnabled?.('system-skill-id'))
    expect(screen.getByTestId('skill-ids')).toHaveTextContent('system-skill-id')
    expect(systemSkillDialogState.current?.selectedSkillIds).toEqual(['system-skill-id'])
  })

  it('does not expose uninstall actions in the agent creation flow', () => {
    installedSkillsState.skills = [
      ...installedSkillsState.skills,
      { id: 'system-skill-id', name: 'System Skill', source: 'system', isGlobalEnabled: true } as InstalledSkill,
      {
        id: 'marketplace-skill-id',
        name: 'Marketplace Skill',
        source: 'marketplace',
        isGlobalEnabled: true
      } as InstalledSkill
    ]
    render(<CapabilityStepHarness />)

    expect(screen.getByRole('checkbox', { name: 'System Skill' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Marketplace Skill' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'library.action.uninstall' })).not.toBeInTheDocument()
  })
})
