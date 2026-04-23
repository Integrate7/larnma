import { act, fireEvent, render, screen } from '@testing-library/react'
import { ElderProfileEdit } from '../elderProfileEdit'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('../controller/controller', () => ({
  useElderProfileController: jest.fn(),
}))

const { useElderProfileController } = jest.requireMock('../controller/controller')

const baseState = {
  loading: false,
  error: null,
  data: null,
  saving: false,
  saved: false,
}

const mockSave = jest.fn()
const baseHandler = { save: mockSave }

describe('ElderProfileEdit', () => {
  beforeEach(() => { mockSave.mockReset() })
  afterEach(() => jest.clearAllMocks())

  it('shows skeleton while loading', () => {
    useElderProfileController.mockReturnValue({ state: { ...baseState, loading: true }, handler: baseHandler })
    render(<ElderProfileEdit elderId="e1" />)
    expect(screen.queryByTestId('elder-edit-save')).toBeNull()
  })

  it('shows error message when error present', () => {
    useElderProfileController.mockReturnValue({
      state: { ...baseState, error: 'โหลดไม่ได้' },
      handler: baseHandler,
    })
    render(<ElderProfileEdit elderId="e1" />)
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดไม่ได้')
  })

  it('shows saved status when saved=true', () => {
    useElderProfileController.mockReturnValue({
      state: { ...baseState, saved: true, data: { name: 'ยาย', allergies: [], conditions: [], addressLine: '' } },
      handler: baseHandler,
    })
    render(<ElderProfileEdit elderId="e1" />)
    expect(screen.getByRole('status')).toHaveTextContent('บันทึกเรียบร้อย')
  })

  it('renders form inputs when data is loaded', () => {
    useElderProfileController.mockReturnValue({
      state: {
        ...baseState,
        data: { name: 'คุณยาย', allergies: ['กุ้ง'], conditions: ['เบาหวาน'], addressLine: '123 ถนน' },
      },
      handler: baseHandler,
    })
    render(<ElderProfileEdit elderId="e1" />)
    expect(screen.getByTestId('elder-edit-allergies')).toBeInTheDocument()
    expect(screen.getByTestId('elder-edit-save')).toBeInTheDocument()
  })

  it('populates allergies from loaded data', () => {
    useElderProfileController.mockReturnValue({
      state: {
        ...baseState,
        data: { name: 'ยาย', allergies: ['กุ้ง', 'หมู'], conditions: [], addressLine: 'a' },
      },
      handler: baseHandler,
    })
    render(<ElderProfileEdit elderId="e1" />)
    const input = screen.getByTestId('elder-edit-allergies') as HTMLInputElement
    expect(input.value).toBe('กุ้ง, หมู')
  })

  it('calls handler.save with parsed values on save button click', async () => {
    mockSave.mockResolvedValue(undefined)
    useElderProfileController.mockReturnValue({
      state: {
        ...baseState,
        data: { name: 'ยาย', allergies: [], conditions: [], addressLine: 'เดิม' },
      },
      handler: baseHandler,
    })
    render(<ElderProfileEdit elderId="e1" />)
    const allergyInput = screen.getByTestId('elder-edit-allergies')
    fireEvent.change(allergyInput, { target: { value: 'กุ้ง' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('elder-edit-save'))
    })
    expect(mockSave).toHaveBeenCalledWith('health', expect.objectContaining({
      allergies: ['กุ้ง'],
    }))
  })

  it('shows default header when no data', () => {
    useElderProfileController.mockReturnValue({ state: baseState, handler: baseHandler })
    render(<ElderProfileEdit elderId="e1" />)
    expect(screen.getByText('แก้ไขข้อมูล')).toBeInTheDocument()
  })
})
