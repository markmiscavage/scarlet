// import React, { Component } from 'react'
// import Dialog from 'material-ui/lib/dialog'
// import FlatButton from 'material-ui/lib/flat-button'
// import RaisedButton from 'material-ui/lib/raised-button'

// import '../../stylesheets/components/dialogModal.scss'

// class FrameComponent extends Component {
//   constructor(props) {
//     super(props)
//     this.state = {
//       frame: null
//     }
//   }

//   componentDidMount = () => {
//     let frame = document.querySelector('.' + this.props.selector + ' iframe')
//     this.setState({
//       frame: frame
//     })
//     console.log(frame, frame.querySelector('.button'))
//     this.props.didMount(this.refs.frame)
//     // const cancelBtn = frame.querySelector('.button.close-popup')
//     // const submitBtn = frameDoc.querySelectorAll('.submit-row input[type=submit]')
//     // console.log('look for selector', frameDoc)
//     // cancelBtn.addEventListener('click', (e) => {
//     //   e.preventDefault()
//     //   alert(location.path)
//     //   this.props.close()
//     // })
//   }
//   render() {
//     return (
//         <div className='frame__wrapper'>
//           <iframe src={this.props.url} />
//         </div>
//       )
//   }
// }

// export default class DialogModal extends Component {
//   constructor(props) {
//     super(props)
//     this.url = 'http://localhost:8000' + props.url
//     this.contentClass = 'modal--' + props.name
//     this.frameSelector = 'frame--' + props.name
//     this.state = {
//       open: false,
//     }
//   }

//   handleOpen = () => {
//     this.setState({open: true})
//   }
//       // const frameDoc = document.querySelectorAll('iframe')
//       // const frameDoc = document.getElementById(`${this.frameSelector}`)
//       // const frameWin = document.querySelector(this.className + ' iframe').contentWindow
//       // const cancelBtn = frameDoc.querySelector('.button.close-popup')
//       // const submitBtn = frameDoc.querySelectorAll('.submit-row input[type=submit]')
//       // console.log('look for selector', frameDoc)
//       // cancelBtn.addEventListener('click', (e) => {
//       //   e.preventDefault()
//       //   alert(location.path)
//       // })
//   onRequestClose = () => {
//     this.setState({open: false})
//   }

//   frameDidMount = (frame) => {
//     console.log('frame mounted', this.refs.frame, frame)
//   }

//   frameWillUnmount = () => {
//     console.log('frame unmounted', this.refs.frame)
//   }

//   refBack = (c) => {
//     console.log(comp)
//   }

//   componentDidUpdate = (stuff, stuffs) => {
//     if (this.state.open) {

//     }
//   }


//   render() {
//       // <RaisedButton label="Modal Dialog" onTouchTap={this.handleOpen} />
//     return (
//       <div >
//         <a className='button add-button' onTouchTap={this.handleOpen} >+ </a>
//         <Dialog 
//           open={this.state.open} 
//           className={this.frameSelector} 
//         >
//           <FrameComponent 
//             ref='frame' 
//             url={this.url} 
//             selector={this.frameSelector}
//             close={this.onRequestClose}
//             didMount={this.frameDidMount}
//             willUnmount={this.frameWillUnmount}
//           />
//         </Dialog>
//       </div>
//     )
//   }
// }