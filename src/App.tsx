import React from 'react';
import './App.css';

/**
 * Get the byte length of a string, which can be greater in
 * some cases than the `.length` property of a JavaScript sting.
 * Some text messaging systems, like Garmin InReach, count
 * bytes to check the maximum length of a message, so use this
 * more conservative measure.
 * https://stackoverflow.com/questions/25994001/how-to-calculate-byte-length-containing-utf8-characters-using-javascript
 */
const getByteLength = (str: string): number =>
  new Blob([str]).size

/**
 * Convert a message into chunks that are small enough to send
 * (ie, chunks that are small enough to fit within `maxLength`).
 * If there are multiple chunks, indicate the number of the
 * chunk and the total count of chunks at the start of each
 * chunk.
 * 
 * @param message
 * @param maxLength defaults to 160, the length of an SMS
 * @returns an array of chunks, ready to be sent
 */
const paginateText = (message: string, maxLength: number = 160): string[] => {
  // TO DO:
  // const maxLengthIfPaginated = maxLength - '[11/99] '.length
  // assert max([len(i) for i in words]) < max_length_if_paginated, "Message contains a word/string that is too long and cannot be split"

  if (message.length === 0) {
    return []
  }

  const words = message.split(/\s+/)

  let messages: string[] = []
  if (getByteLength(message) <= maxLength) {
    messages = [words.join(' ')]
  } else {
    let currentMessage = '[1/XX]'
    words
      .filter(w => w.length > 0)
      .forEach(word => {
        if (getByteLength(currentMessage) + ' '.length + getByteLength(word) > maxLength) {
          messages.push(currentMessage)
          currentMessage = `[${messages.length + 1}/XX]`
        }
        currentMessage = [currentMessage, word].join(' ')
      })
    messages.push(currentMessage)

    messages = messages.map(
      (m: string): string => m.replace(
        /^\[(\d{1,2})\/XX\] /,
        (match, messageNumber) => `[${messageNumber}/${messages.length}] `
      )
    )
  }

  return messages
}

type OutputRowProps = {
  message: string;
  part: number;
}

type OutputRowState = {
  copied: boolean
}

class OutputRow extends React.Component<OutputRowProps, OutputRowState> {
  constructor(props: any) {
    super(props)
    this.state = {copied: false}

    this.handleCopy = this.handleCopy.bind(this)
  }

  handleCopy() {
    navigator.clipboard.writeText(this.props.message)
    this.setState({copied: true})
  }

  render() {
    return (
      <div className={`OutputRow ${this.state.copied ? 'OutputRow-copied' : ''}`}>
        <textarea
          value={this.props.message}
          readOnly
          className="OutputRow-message"
        ></textarea>
        <button
          className="OutputRow-copy"
          onClick={this.handleCopy}
        >Copy Part {this.props.part}</button>
      </div>
    )
  }
}

type AppState = {
  message: string;
  submitClicked: boolean;
  paginatedMessages: string[];
}

class App extends React.Component<{}, AppState> {
  constructor(props: any) {
    super(props)
    this.state = {
      message: '',
      submitClicked: false,
      paginatedMessages: []
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleChange(e: React.ChangeEvent<HTMLTextAreaElement> | React.FocusEvent<HTMLTextAreaElement>) {
    const message = e.currentTarget.value
    this.setState({
      submitClicked: false,
      message
    })
  }

  handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Since this site is built primarily for Garmin InReach
    // messaging, use 12 fewer characters than the usual 160,
    // since Gamin sometimes reserves 12 characters at the end
    // of each message
    const garminMessageMaxLength = 160 - 12
    const paginatedMessages = paginateText(
      this.state.message,
      garminMessageMaxLength
    )
    this.setState({
      submitClicked: this.state.message.length > 0,
      paginatedMessages
    })
  }

  render() {
    return(
      <div className="App">
        <div className={`Input ${this.state.submitClicked ? "Input-submitted" : ''}`}>
          <span className="Input-header">Step 1: Enter text to be paginated:</span>
          <form onSubmit={this.handleSubmit}>
            <div>
              <textarea
                value={this.state.message}
                onChange={this.handleChange}
                onFocus={this.handleChange}
                className="Input-message"
                autoComplete="off"
                autoFocus={true}
                placeholder="The message typed in here will be split into parts short enough for an SMS"
                spellCheck="false"
              ></textarea>
            </div>

            <input type="submit" value="Paginate Message"></input>
          </form>
        </div>

        {
          this.state.submitClicked
            ? <div className="Output">
              <span className="Output-header">Step 2: Copy and send each part:</span>

              {
                this.state.paginatedMessages.map((m, i) =>
                  <OutputRow message={m} part={i + 1} key={i} />
                )
              }
            </div>
            : ''
        }
      </div>
    )
  }
}

export default App;
