package io.patientcare.example;

import javax.json.Json;

import org.junit.jupiter.api.Test;

class EmailSenderMainTest {

	@Test
	void testCeckAndCreateUser() {
		EmailSenderMain.checkAndCreateUser("manuel-XPS-13-9360", "pat1");
	}

	@Test
	void testSendEmail() {
		EmailSenderMain.sendEmail(
				EmailSenderMain.createMailSession("manuel-XPS-13-9360", "", ""), "manuel-XPS-13-9360", "pat1", Json.createObjectBuilder().build());
	}

}
