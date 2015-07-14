import * as Validator from './validator';
import StateMap from '../map/state';

export default function evaluateExpression(expr, wrapper, el, key, childProps) {
	let state = wrapper.state;
	//eval media queries
	if (Validator.isMediaQuery(expr)) {
		if (window.matchMedia) {
			return window.matchMedia(expr.replace('@media', '').trim()).matches;
		} else {
			throw "Can not resolve media queries. Caused by evaluateExpression " + expr;
		}
	}

	//eval conditions
	else if (Validator.isCondition(expr)) {
		let [
			property, value
		] = expr.split('=');
		if (state[property] == value) {
			return true;
		}
	}

	//eval pseudos 
	else if (Validator.isPseudo(expr)) {
		//mouse pseudos
		if (Validator.isPseudoHover(expr)) {
			if (StateMap.get(wrapper, key).get('hovered') == true) {
				return true;
			}
		} else if (Validator.isPseudoFocus(expr)) {
			if (StateMap.get(wrapper, key).get('focused') == true) {
				return true;
			}
		} else if (Validator.isPseudoActive(expr)) {
			if (StateMap.get(wrapper, key).get('active') == true) {
				return true;
			}
		}

		if (el.type == 'input') {
			//Input Pseudos
			if (Validator.isPseudoChecked(expr)) {
				return (el.props.hasOwnProperty('checked') || el.props.checked == true);
			} else if (Validator.isPseudoDisabled(expr)) {
				return (el.props.hasOwnProperty('disabled') && el.props.disabled == true);
			} else if (Validator.isPseudoEnabled(expr)) {
				return (!el.props.hasOwnProperty('disabled') || el.props.disabled == false);
			} else if (Validator.isPseudoRequired(expr)) {
				return (el.props.hasOwnProperty('required') && el.props.required == false);
			} else if (Validator.isPseudoOptional(expr)) {
				return (!el.props.hasOwnProperty('required') || el.props.required == false);
			} else if (Validator.isPseudoInRange(expr)) {
				return (evaluateRange(el.props) == 'in' ? true : false);
			} else if (Validator.isPseudoOutOfRange(expr)) {
				return (evaluateRange(el.props) == 'out' ? true : false);
			} else if (Validator.isPseudoReadOnly(expr)) {
				return (el.props.hasOwnProperty('readonly') && el.props.readonly == true)
			} else if (Validator.isPseudoReadWrite(expr)) {
				return (!el.props.hasOwnProperty('readonly') || el.props.readonly == false)
			} else if (Validator.isPseudoIndeterminate(expr)) {
				return (el.props.hasOwnProperty('indeterminate') && el.props.indeterminate == true)
			} else if (Validator.isPseudoValid(expr)) {
				return validateValue(StateMap.get(wrapper, key).get('changed'), el.props.type);
			} else if (Validator.isPseudoInvalid(expr)) {
				return !validateValue(StateMap.get(wrapper, key).get('changed'), el.props.type);
			}
		}

		//other
		else if (Validator.isPseudoLang(expr) && state.lang) {
			return expr.includes(lang);
		} else if (Validator.isPseudoEmpty(expr)) {
			return (!el.props.children || el.props.children.length < 1);
		}

		//index-sensitive
		if (Validator.isPseudoFirstChild(expr)) {
			if (childProps.hasOwnProperty('index')) {
				return childProps.index == 0;
			}
			return false;
		} else if (Validator.isPseudoLastChild(expr)) {
			if (childProps.hasOwnProperty('index') && childProps.hasOwnProperty('length')) {
				return childProps.index == childProps.length - 1;
			}
			return false;
		} else if (Validator.isPseudoOnlyChild(expr)) {
			if (childProps.hasOwnProperty('length')) {
				return childProps.length == 1;
			}
			return false;
		} else if (Validator.isPseudoNthChild(expr)) {
			if (childProps.hasOwnProperty('index')) {
				return evaluateNthChild(expr.replace(/ /g, ''), childProps.index);
			}
			return false;
		} else if (Validator.isPseudoNthLastChild(expr)) {
			if (childProps.hasOwnProperty('index') && childProps.hasOwnProperty('length')) {
				return evaluateNthChild(expr.replace(/ /g, ''), (childProps.length - 1) - childProps.index, true);
			}
			return false;
		}

		//TODO: type-sensitive
	}
	return false;
}

//TODO: drunk => dirty, fix later
function evaluateNthChild(expr, index, reverse) {
	let split = (reverse ? expr.split(':nth-last-child(') : expr.split(':nth-child('));
	let value = split[1].substr(0, split[1].length - 1);
	if (value == 'odd') {
		return index % 2 == 0;
	} else if (value == 'even') {
		return index % 2 != 0;
	} else {
		if (value.includes('n')) {
			let termSplit = value.split('n');
			let mult = termSplit[0];
			mult = (mult == '-' ? '-1' : mult);

			let add = termSplit[1];
			add = parseInt(add);
			mult = parseInt(mult);
			++index;

			if (isNaN(mult)) {
				return index >= add;
			} else if (mult == -1) {
				return index <= add;
			} else {
				return (index - add) % mult == 0;
			}
		} else {
			return index == parseInt(value);
		}
	}
}

function validateValue(value, type) {
	if (type == 'email') {
		return validateEmail(value);
	} else if (type == 'url') {
		return validateUrl(value);
	} else if (type == 'number' || type == 'range') {
		return validateNumber(value);
	} else if (type == 'tel') {
		//TODO: tel validation
		return false;
	} else {
		return false;
	}
}

function validateEmail(email) {
	const regEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return regEx.test(email);
}

function validateUrl(url) {
	var regEx = new RegExp(
		"^" +
		// protocol identifier
		"(?:(?:https?|ftp)://)" +
		// user:pass authentication
		"(?:\\S+(?::\\S*)?@)?" +
		"(?:" +
		// IP address exclusion
		// private & local networks
		"(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
		"(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
		"(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
		// IP address dotted notation octets
		// excludes loopback network 0.0.0.0
		// excludes reserved space >= 224.0.0.0
		// excludes network & broacast addresses
		// (first & last IP address of each class)
		"(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
		"(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
		"(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
		"|" +
		// host name
		"(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
		// domain name
		"(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
		// TLD identifier
		"(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
		// TLD may end with dot
		".?" +
		")" +
		// port number
		"(?::\\d{2,5})?" +
		// resource path
		"(?:[/?#]\\S*)?" +
		"$", "i"
	);
	return regEx.test(url);
}

function validateNumber(value) {
	return !isNaN(parseFloat(value)) && isFinite(value);
}

function evaluateRange(props) {
	let val = props.value;
	let min = props.min;
	let max = props.max;
	if (min != undefined && max != undefined) {
		if (val >= min && val <= max) {
			return 'in';
		} else {
			return 'out';
		}
	} else {
		return false;
	}
}