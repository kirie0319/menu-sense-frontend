import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '@/page-components/HomePage'

// Mock the store
const mockSetFile = jest.fn()
const mockStore = {
  selectedFile: null,
  setFile: mockSetFile,
}

jest.mock('@/lib/store', () => ({
  useTranslationStore: () => mockStore,
}))

// Mock components
jest.mock('@/features/debug', () => ({
  ServerStatus: function MockServerStatus({ onStatusChange }: any) {
    React.useEffect(() => {
      onStatusChange(true)
    }, [onStatusChange])
    return <div data-testid="server-status">Server Status</div>
  }
})

jest.mock('@/components/CameraCapture', () => {
  return function MockCameraCapture({ isOpen, onCapture, onClose }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="camera-capture">
        <button onClick={() => onCapture(new File(['test'], 'camera.jpg', { type: 'image/jpeg' }))}>
          Capture
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSetFile.mockClear()
  })

  it('should render main elements correctly', () => {
    render(<HomePage />)
    
    expect(screen.getByText('MenuSense')).toBeInTheDocument()
    expect(screen.getByText(/Finally understand/)).toBeInTheDocument()
    expect(screen.getByText('Try it now with your menu photo')).toBeInTheDocument()
  })

  it('should handle file upload', async () => {
    const user = userEvent.setup()
    render(<HomePage />)
    
    const file = new File(['test'], 'menu.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    await user.upload(fileInput, file)
    
    expect(mockSetFile).toHaveBeenCalledWith(file)
  })

  it('should show success state when file is selected', () => {
    // Update mock store to have a selected file
    jest.doMock('@/lib/store', () => ({
      useTranslationStore: () => ({
        ...mockStore,
        selectedFile: new File(['test'], 'menu.jpg', { type: 'image/jpeg' }),
      }),
    }))
    
    render(<HomePage />)
    
    expect(screen.getByText('Menu uploaded successfully!')).toBeInTheDocument()
  })

  it('should open camera when take photo is clicked', async () => {
    const user = userEvent.setup()
    render(<HomePage />)
    
    const takePhotoButton = screen.getByRole('button', { name: /take photo/i })
    await user.click(takePhotoButton)
    
    expect(screen.getByTestId('camera-capture')).toBeInTheDocument()
  })
}) 