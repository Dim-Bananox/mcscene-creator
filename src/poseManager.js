export function createPoseManager(deps) {
	const {
		savePoseBtn,
		loadPoseBtn,
		poseGalleryModal,
		poseGalleryContent,
		sliders,
		getSelectedCharacter,
		openModal,
		t,
		STEVE_SKIN,
		SkinViewer,
		deg
	} = deps

	let poseDB = JSON.parse(localStorage.getItem('poses') || '{}')

	const applyPose = pose => {
		if (!pose?.data || typeof pose.data !== 'object') return
		Object.entries(pose.data).forEach(([key, value]) => {
			if (!sliders[key]) return
			sliders[key].value = value
			sliders[key].dispatchEvent(new Event('input'))
		})
	}

	const renderGallery = () => {
		if (!poseGalleryContent) return
		poseGalleryContent.innerHTML = ''

		for (const [name, pose] of Object.entries(poseDB)) {
			if (!pose || typeof pose !== 'object') {
				delete poseDB[name]
				continue
			}

			const card = document.createElement('div')
			card.className = 'poseCard'

			const miniCanvas = document.createElement('canvas')
			miniCanvas.width = 80
			miniCanvas.height = 100

			const skinUrl = pose.skin && typeof pose.skin === 'string' ? pose.skin : STEVE_SKIN
			const miniViewer = new SkinViewer({
				canvas: miniCanvas,
				width: 80,
				height: 100,
				skin: skinUrl
			})

			const map = {
				headX: ['head', 'x'],
				headY: ['head', 'y'],
				rightArmX: ['rightArm', 'x'],
				rightArmZ: ['rightArm', 'z'],
				leftArmX: ['leftArm', 'x'],
				leftArmZ: ['leftArm', 'z'],
				rightLegX: ['rightLeg', 'x'],
				leftLegX: ['leftLeg', 'x']
			}

			if (pose.data && typeof pose.data === 'object') {
				Object.entries(pose.data).forEach(([key, value]) => {
					const [part, axis] = map[key] || []
					if (part && axis && miniViewer.playerObject.skin[part]) {
						miniViewer.playerObject.skin[part].rotation[axis] = deg(value)
					}
				})
			}

			const strong = document.createElement('strong')
			strong.textContent = name

			const applyBtn = document.createElement('button')
			applyBtn.className = 'btnSecondary'
			applyBtn.textContent = t('apply')
			applyBtn.onclick = () => applyPose(pose)

			const delBtn = document.createElement('button')
			delBtn.className = 'btnGhost'
			delBtn.textContent = t('delete')
			delBtn.onclick = () => {
				delete poseDB[name]
				localStorage.setItem('poses', JSON.stringify(poseDB))
				if (Object.keys(poseDB).length === 0) {
					if (poseGalleryModal) poseGalleryModal.style.display = 'none'
					return
				}
				renderGallery()
			}

			card.append(miniCanvas, strong, applyBtn, delBtn)
			poseGalleryContent.appendChild(card)
		}

		localStorage.setItem('poses', JSON.stringify(poseDB))
	}

	if (savePoseBtn) {
		savePoseBtn.onclick = async () => {
			const POSE_NAME_MAX = 24
			const name = await openModal({
				message: t('namePose'),
				inputPlaceholder: t('posePlaceholder'),
				showInput: true,
				maxLength: POSE_NAME_MAX
			})
			const cleanName = (name || '').trim()
			if (!cleanName) return

			if (cleanName.length > POSE_NAME_MAX) {
				await openModal({
					message: `Pose name too long (max ${POSE_NAME_MAX} characters).`,
					showInput: false,
					showCancel: false
				})
				return
			}

			if (poseDB[cleanName]) {
				await openModal({
					message: t('poseExists'),
					showInput: false,
					showCancel: false
				})
				return
			}

			const sel = getSelectedCharacter()
			poseDB[cleanName] = {
				skin: sel?.skin || STEVE_SKIN,
				data: Object.fromEntries(
					Object.entries(sliders).map(([key, value]) => [key, value.value])
				)
			}
			localStorage.setItem('poses', JSON.stringify(poseDB))

			await openModal({
				message: t('poseSaved'),
				showInput: false,
				showCancel: false
			})
		}
	}

	if (loadPoseBtn) {
		loadPoseBtn.onclick = () => {
			if (!poseDB || Object.keys(poseDB).length === 0) {
				openModal({
					message: t('noPoses'),
					showInput: false,
					showCancel: false
				})
				return
			}
			renderGallery()
			if (poseGalleryModal) poseGalleryModal.style.display = 'flex'
		}
	}

	if (poseGalleryModal) {
		poseGalleryModal.onclick = e => {
			if (e.target === poseGalleryModal) poseGalleryModal.style.display = 'none'
		}
	}

	return { renderGallery }
}
