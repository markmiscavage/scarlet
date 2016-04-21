// import React, { Component, PropTypes } from 'react'
// import axios from 'axios'
// import { formatResults, findIndexById } from './autoFillUtils'
// import { MultiSelect } from 'react-selectize'
// import DialogModal from '../DialogModal'
// import '../../../stylesheets/components/autofill.scss'

// const Pill = (props) => {
//   return (
//     <div className="pill__wrapper">
//       <span className="pill__close" onClick = {props.removeSelectedItem.bind(this, props)}>x</span>
//         {props.value}
//     </div>
//   )
// }

// class AutoFill extends Component {

//   constructor(props) {
//     super(props)
//     this.state = {
//       sourceOptions: [],
//       selectedItems: []
//     }
//   }

//   handleFocus = () => {
//     this.onSearchChange('')
//   } 

//   removeSelectedItem = (props, e) => {
//     e.stopPropagation()
//     let itemIndex = findIndexById(props.id, this.state.selectedItems)
//     let selectedItems = this.state.selectedItems.splice(itemIndex, 1)
//     this.render()
//   }

//   renderValue = (item) => {
//     return <Pill {...item} removeSelectedItem={this.removeSelectedItem}/>
//   }

//   onValuesChange = (selectedItems) => {
//     this.setState({
//       selectedItems: selectedItems
//     })
//   }

//   onSearchChange = (value) => { 
//     let url = this.props.dataApi + '&page=1&search=' + value
//     axios.get(url)
//       .then( (response) => {
//         this.setState({
//           sourceOptions: formatResults(response)
//         })
//       })
//       .catch( (response) => {
//         console.log(response)
//       })
//   }

//   render() {
//     let ref = 'autofill-' + this.props.name
//     return (
//       <div>
//         <MultiSelect
//             placeholder = 'Select it'
//             options = {this.state.sourceOptions}
//             onValuesChange = {this.onValuesChange}
//             onFocus={this.handleFocus}
//             onSearchChange={this.onSearchChange}
//             theme='material'
//             renderValue={this.renderValue}
//             createFromSearch={this.createFromSearch}
//             values={this.state.selectedItems}
//             ref={ref}
//         />
//         <DialogModal url={this.props.dataAdd} name={this.props.name} />
//       </div>
//     )
//   }


// }

// AutoFill.propTypes = { 
//   dataApi: PropTypes.string.isRequired,
//   dataAdd: PropTypes.string.isRequired,
//   name: PropTypes.string,
// }

// export default AutoFill