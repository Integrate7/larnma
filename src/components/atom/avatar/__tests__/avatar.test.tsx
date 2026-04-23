import { render, screen } from '@testing-library/react'
import { Avatar, AvatarFallback, AvatarImage } from '../avatar'

describe('Avatar', () => {
  it('renders fallback when no image', () => {
    render(
      <Avatar>
        <AvatarImage src="" alt="x" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    expect(screen.getByText('AB')).toBeInTheDocument()
  })
})
