package io.patientcare.example;

import java.io.IOException;

import javax.json.Json;

import org.junit.jupiter.api.Test;

class EmailSenderMainTest {

	@Test
	void testCeckAndCreateUser() {
		EmailSenderMain.checkAndCreateUser("manuel-XPS-13-9360", "example");
	}

	@Test
	void testSendEmail() {
		EmailSenderMain.sendEmail(
				EmailSenderMain.createMailSession("manuel-XPS-13-9360", "", ""), "manuel-XPS-13-9360", "example", Json.createObjectBuilder().build());
	}
	
	@Test
	void testCaso47() throws IOException {
		EmailSenderMain.createCaso47Example(
				"manuel-XPS-13-9360", EmailSenderMain.createMailSession("manuel-XPS-13-9360", "", ""));
	}

}
