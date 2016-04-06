import getMuiTheme from 'material-ui/lib/styles/getMuiTheme'
import { red500, red700 } from 'material-ui/lib/styles/colors'

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: red500,
    primary2Color: red700,
    pickerHeaderColor: red500
  }
})

export default muiTheme