const dasherize = text => {
	return text.replace(/\s+/g, '-').toLowerCase()
}

export { dasherize }
