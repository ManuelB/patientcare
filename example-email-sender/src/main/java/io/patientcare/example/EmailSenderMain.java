package io.patientcare.example;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.activation.DataHandler;
import javax.activation.FileDataSource;
import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonObject;
import javax.json.JsonValue;
import javax.json.JsonValue.ValueType;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.InternetHeaders;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.util.ByteArrayDataSource;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status.Family;

public class EmailSenderMain {
	private static final Pattern PATIENT_MATCHER = Pattern.compile("Patient/.*");

	private static Map<String, Boolean> userCreated = new ConcurrentHashMap<>();

	private static ExecutorService executor = Executors.newCachedThreadPool();

	public static void main(String[] args) throws IOException {
		String host = args.length > 0 ? args[0] : "manuel-XPS-13-9360";
		String user = args.length > 1 ? args[1] : "";
		String password = args.length > 2 ? args[2] : "";

		Session session = createMailSession(host, user, password);
		createFHIRExamples(host, session);
		createCaso47Example(host, session);
	}

	static void createCaso47Example(String host, Session session) throws IOException {
		String patientId = "caso-47";
		checkAndCreateUser(host, patientId);
		Files.list(Paths.get("covid-19-examples")).parallel().forEach((file) -> {
			try {
				if (file.toFile().getName().endsWith(".json")) {
					JsonObject document = Json.createReader(Files.newBufferedReader(file)).readObject();
					sendEmail(session, host, patientId, document);
				} else {
					sendEmail(session, host, patientId, file);
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		});

	}

	private static void createFHIRExamples(String host, Session session) throws IOException {
		List<Future<?>> futures = new ArrayList<>();
		List<JsonObject> jsonObjects = Files.list(Paths.get("fhir-examples/json")).parallel().map((file) -> {
			try {
				return Json.createReader(Files.newBufferedReader(file)).readObject();
			} catch (Exception e) {
				e.printStackTrace();
				return null;
			}
		}).filter(Objects::nonNull).collect(Collectors.toList());

		for (JsonObject document : jsonObjects) {
			sendFHIREmail(futures, host, session, document);
		}
		// Wait for all emails to be send
		futures.stream().forEach(f -> {
			try {
				f.get();
			} catch (InterruptedException | ExecutionException e) {
				e.printStackTrace();
			}
		});
		executor.shutdown();
	}

	private static void sendFHIREmail(List<Future<?>> futures, String host, Session session, JsonObject document) {
		if (document.containsKey("resourceType") && document.containsKey("id")) {
			if (document.getString("resourceType").equals("Patient")) {
				futures.add(executor.submit(() -> sendEmail(session, host, document.getString("id"), document)));
			}
			System.out.println(document.getString("resourceType") + " " + document.getString("id"));
			if (document.containsKey("subject")) {
				JsonValue subjectValue = document.get("subject");
				JsonObject subject;
				if (subjectValue.getValueType() == ValueType.OBJECT) {
					subject = (JsonObject) subjectValue;
				} else if (subjectValue.getValueType() == ValueType.ARRAY) {
					subject = ((JsonArray) subjectValue).getJsonObject(0);
				} else {
					subject = null;
				}
				if (subject != null && subject.containsKey("reference")) {
					String reference = subject.getString("reference");
					System.out.println("-> " + reference);
					if (PATIENT_MATCHER.matcher(reference).matches()) {
						futures.add(executor.submit(() -> sendEmail(session, host, reference.split("/")[1], document)));
					}
				}
			}
		}
	}

	static Session createMailSession(String host, String user, String password) {
		Properties props = new Properties();
		props.put("mail.smtp.auth", "false");
		props.put("mail.smtp.starttls.enable", "false");
		props.put("mail.smtp.host", host);
		props.put("mail.smtp.port", "25");

		// Get the Session object.
		Session session = Session.getInstance(props, new javax.mail.Authenticator() {
			protected PasswordAuthentication getPasswordAuthentication() {
				return new PasswordAuthentication(user, password);
			}
		});
		return session;
	}

	static void sendEmail(Session session, String host, String patientId, Object file) {
		checkAndCreateUser(host, patientId);
		JsonObject document = null;
		File attachment = null;
		if (file instanceof JsonObject) {
			document = (JsonObject) file;
		}
		if (file instanceof Path) {
			attachment = ((Path) file).toFile();
		}
		try {
			// Create a default MimeMessage object.
			Message message = new MimeMessage(session);

			// Set From: header field of the header.
			message.setFrom(new InternetAddress("examples@" + host));
			// Set To: header field of the header.
			message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(patientId + "@" + host));

			String resourceType = "Unknown";
			String resourceId = "Unknown";
			// Set Subject: header field
			if (document != null && document.containsKey("resourceType") && document.containsKey("id")) {
				resourceType = document.getString("resourceType");
				resourceId = document.getString("id");
			} else if (attachment != null) {
				resourceType = attachment.getName().endsWith(".pdf") ? "PDF Document"
						: attachment.getName().endsWith(".jpeg") ? "JPEG Image" : "";
				resourceId = attachment.getName();
			}
			message.setSubject(resourceType + " " + resourceId);

			// Create the message part
			BodyPart messageBodyPart = new MimeBodyPart();

			try {
				messageBodyPart.setText(resourceType + " issued on "
						+ (document != null && document.containsKey("issued") ? document.getString("issued")
								: "unknown"));
			} catch (Exception ex) {
				// Now set the actual message
				messageBodyPart.setText(document != null ? document.toString() : ex.getMessage());
			}

			// Create a multipar message
			Multipart multipart = new MimeMultipart();

			// Set text message part
			multipart.addBodyPart(messageBodyPart);

			// Part two is attachment
			InternetHeaders headers = new InternetHeaders();
			if (document != null) {
				headers.addHeader("Content-Type", "application/fhir+json");
				headers.addHeader("Content-Disposition",
						"attachment; filename=" + resourceType + "-" + resourceId + ".json");
				messageBodyPart = new MimeBodyPart(headers, document.toString().getBytes("UTF-8"));
			} else if (attachment != null) {
				messageBodyPart = new MimeBodyPart();
				messageBodyPart.setFileName(attachment.getName());
				ByteArrayDataSource ds = new ByteArrayDataSource(Files.readAllBytes(attachment.toPath()),
						attachment.getName().endsWith(".pdf") ? "application/pdf"
								: attachment.getName().endsWith(".jpeg") ? "image/jpeg" : "application/octet-stream");

				messageBodyPart.setDataHandler(new DataHandler(ds));
			}
			multipart.addBodyPart(messageBodyPart);

			// Send the complete message parts
			message.setContent(multipart);

			// Send message
			Transport.send(message);

			System.out.println("Sent message successfully....");

		} catch (MessagingException | IOException e) {
			e.printStackTrace();
		}
	}

	synchronized static void checkAndCreateUser(String host, String patientId) {
		if (!userCreated.containsKey(patientId)) {
			Response response = ClientBuilder.newClient().target("http://" + host + ":8000")
					.path("/users/" + patientId + "@" + host).request()
					.buildPut(Entity.json(Json.createObjectBuilder().add("password", "example").build())).invoke();
			if (response.getStatusInfo().getFamily() != Family.SUCCESSFUL) {
				System.out.println(response.readEntity(String.class));
			} else {
				System.out.println(patientId + " created");
			}
			userCreated.put(patientId, true);
		}
	}
}
