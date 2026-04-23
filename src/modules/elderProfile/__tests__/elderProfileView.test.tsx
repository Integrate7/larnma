import { render, screen } from '@testing-library/react'
import { ElderProfileView } from '../elderProfileView'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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

const baseHandler = { save: jest.fn() }

describe('ElderProfileView', () => {
  afterEach(() => jest.clearAllMocks())

  it('shows skeleton while loading', () => {
    useElderProfileController.mockReturnValue({ state: { ...baseState, loading: true }, handler: baseHandler })
    const { container } = render(<ElderProfileView elderId="e1" />)
    expect(container.querySelector('[data-testid="elder-profile-view"]')).toBeNull()
  })

  it('shows error message when error present', () => {
    useElderProfileController.mockReturnValue({
      state: { ...baseState, error: 'ไม่พบข้อมูล' },
      handler: baseHandler,
    })
    render(<ElderProfileView elderId="e1" />)
    expect(screen.getByRole('alert')).toHaveTextContent('ไม่พบข้อมูล')
  })

  it('shows profile data when loaded', () => {
    useElderProfileController.mockReturnValue({
      state: {
        ...baseState,
        data: {
          name: 'คุณยาย',
          phone: '0811111111',
          addressLine: '123 ถนนทดสอบ',
          district: 'บางรัก',
          province: 'กรุงเทพ',
          postalCode: '10500',
          conditions: ['เบาหวาน'],
          allergies: ['กุ้ง'],
        },
      },
      handler: baseHandler,
    })
    render(<ElderProfileView elderId="e1" />)
    expect(screen.getByTestId('elder-profile-view')).toBeInTheDocument()
    expect(screen.getByTestId('elder-profile-name')).toHaveTextContent('คุณยาย')
    expect(screen.getByTestId('elder-profile-allergies')).toHaveTextContent('กุ้ง')
  })

  it('shows dash for empty conditions', () => {
    useElderProfileController.mockReturnValue({
      state: {
        ...baseState,
        data: {
          name: 'คุณยาย',
          phone: '0811111111',
          addressLine: 'a',
          district: 'b',
          province: 'c',
          postalCode: '10100',
          conditions: [],
          allergies: [],
        },
      },
      handler: baseHandler,
    })
    render(<ElderProfileView elderId="e1" />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('renders default header when no data', () => {
    useElderProfileController.mockReturnValue({ state: baseState, handler: baseHandler })
    render(<ElderProfileView elderId="e1" />)
    expect(screen.getByTestId('elder-profile-name-header')).toHaveTextContent('ข้อมูลผู้สูงอายุ')
  })

  it('renders edit link', () => {
    useElderProfileController.mockReturnValue({
      state: {
        ...baseState,
        data: {
          name: 'ยาย',
          phone: '0811111111',
          addressLine: 'a',
          district: 'b',
          province: 'c',
          postalCode: '10100',
          conditions: [],
          allergies: [],
        },
      },
      handler: baseHandler,
    })
    render(<ElderProfileView elderId="e1" />)
    expect(screen.getByText('แก้ไขข้อมูล')).toBeInTheDocument()
  })
})
