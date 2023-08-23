/* globals define */
define({
	root: {
		updateWidget: "An updated widget is available <a href=\"{update_url}\" target=\"_blank\">here</a>.",
		updateCriticalWidget: "A critical update to the  widget is required, <a href=\"{update_url}\" target=\"_blank\">click here</a> to update.",
    callbackUrl: 'Callback URL',
    defaultOrganization: 'Default Organization (optional)',
		defaultUserName: "Filtrera automatisk på användarnamn (frivilligt):",
		defaultUserNameInstruction: "Lägg till flera användarnamn genom att separera med komma (inga blanksteg)",
		clientId: "Mapillary Client ID",
		obtainClientId: "Ditt Client ID är din personliga kod. Du hittar det i dina kontoinställningar.",
		clientIdInstructions: "Please paste it in the clientId field afterwards.",
		advancedOptions: "Avancerade inställningar",
		allowUserFilter: "Tillåt användare att ändra kartfilter efter att kartan laddats",
		allowUserFilterInstruction: "Behåll ikryssad för att förhindra andra användare från att ändra nuvarande filterinställningar",
		imageInstruction: "Kryssa ur för att ta bort transitioner mellan pixlar vid navigation, men också visar en togglingsknapp för den här funktionen.",
		imageDetails: "Visa bildövergångsverktyg",
		directionInstruction: "Kryssa ur för att undvika att de stora navigeringspilarna läggs ovanpå bilder",
		directionDetails: "Tillåt spatial navigation",
		sequenceInstruction: "Kryssa ur för att dölja de små pilarna i toppen av bildvisarens när du navigerar i en sekvens",
		sequenceDetails: "Tillåt navigation i en sekvens",
		bearingInstruction: "Kryssa ur för att ta bort kameravinkel-indikator i botten av bildvisaren",
		bearingDetails: "Visa kameravinkel-indikator",
		clearCoverageDetails: "Dölj täckningslager vid avslut",
		clearCoverageInstruction: "Kryssa ur för att låta täckningslagret och aktuella filter vara kvar när widgeten avslutas"
	}
})
