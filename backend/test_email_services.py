from azure.communication.email import EmailClient

def main():
    try:
        connection_string = "endpoint=https://uniorg-cs.europe.communication.azure.com/;accesskey=3qDMC0D1ldjxt7tPsEAOSPwI6sP7pRm2aa4mz1F44Sryscon9g7jJQQJ99BKACULyCpTNnCJAAAAAZCSHJpp"
        client = EmailClient.from_connection_string(connection_string)

        message = {
            "senderAddress": "DoNotReply@410f18c0-1626-42b8-a65e-a103ee974837.azurecomm.net",
            "recipients": {
                "to": [{"address": "kaczorb97@gmail.com"}]
            },
            "content": {
                "subject": "Test Email",
                "plainText": """Hello world via email.""",
                "html": """
				<html>
					<body>
						<h1>
							Hello world via email.
						</h1>
					</body>
				</html>"""
            },
            
        }

        poller = client.begin_send(message)
        result = poller.result()
        print(result)
        print("Message sent: ", result.get('id'))

    except Exception as ex:
        print(ex)

main()