import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioGroup, RadioGroupItem } from '../radioGroup'

describe('RadioGroup', () => {
  it('selects via click', async () => {
    const onValueChange = jest.fn()
    render(
      <RadioGroup onValueChange={onValueChange}>
        <RadioGroupItem value="a" id="a" />
        <RadioGroupItem value="b" id="b" />
      </RadioGroup>,
    )
    const radios = screen.getAllByRole('radio')
    await userEvent.click(radios[1])
    expect(onValueChange).toHaveBeenCalledWith('b')
  })
})
