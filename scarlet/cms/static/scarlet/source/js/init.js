import DateSelector from './components/date/DateSelector'
import $ from 'jquery'
import Select from './components/select/Select'



// DATEPICKER
const dateSelector = new DateSelector()
dateSelector.render()

// SELECT
const select = new Select()
select.render()
