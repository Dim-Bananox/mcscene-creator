export function createBackgroundManager(deps) {
	const { bgUpload, uploadBgBtn, bgColorPicker, bgTransparent, removeBgBtn } = deps

	let bgColor = bgColorPicker?.value || '#000000'
	let bgImage = null
	let transparentMode = false

	if (uploadBgBtn && bgUpload) uploadBgBtn.onclick = () => bgUpload.click()

	const bgLayer = document.getElementById('backgroundLayer')
	if (bgTransparent) {
		transparentMode = true
		bgTransparent.classList.add('active')
	}

	const updateBackground = () => {
		if (!bgLayer) return
		if (transparentMode) {
			bgLayer.style.backgroundColor = 'transparent'
		} else {
			bgLayer.style.backgroundColor = bgColor
		}

		if (bgImage) {
			bgLayer.style.backgroundImage = `url("${bgImage}")`
			bgLayer.style.backgroundSize = 'contain'
			bgLayer.style.backgroundRepeat = 'no-repeat'
			bgLayer.style.backgroundPosition = 'center'
		} else {
			bgLayer.style.backgroundImage = ''
		}
	}

	updateBackground()

	if (bgColorPicker) {
		bgColorPicker.addEventListener('input', () => {
			bgColor = bgColorPicker.value
			if (!transparentMode) updateBackground()
		})
	}

	if (bgTransparent) {
		bgTransparent.addEventListener('click', () => {
			transparentMode = !transparentMode
			bgTransparent.classList.toggle('active', transparentMode)
			updateBackground()
		})
	}

	if (bgUpload) {
		bgUpload.addEventListener('change', e => {
			const file = e.target.files[0]
			if (!file) return

			bgImage = URL.createObjectURL(file)
			updateBackground()
		})
	}

	if (removeBgBtn) {
		removeBgBtn.onclick = () => {
			bgImage = null
			updateBackground()
		}
	}

	return {
		isTransparent: () => transparentMode,
		updateBackground
	}
}
