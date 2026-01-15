from typing import Optional
from app.core.config import settings


class S3Service:
    def __init__(self):
        self.use_s3 = settings.USE_S3
        self.s3_client = None
        self.bucket = None

        if not self.use_s3:
            return

        try:
            import boto3
            import uuid

            self.uuid = uuid

            self.s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )

            self.bucket = settings.S3_BUCKET_NAME

        except Exception:
            # boto3 not installed or config missing
            self.use_s3 = False

    # ----------------------------------------------------

    async def upload_file(self, data: bytes, filename: str) -> Optional[str]:
        """
        If S3 is enabled → upload to S3
        Otherwise → just return filename (local storage)
        """

        if not self.use_s3:
            return filename

        try:
            ext = filename.split(".")[-1] if "." in filename else ""
            unique_name = f"{self.uuid.uuid4()}"
            key = f"documents/{unique_name}.{ext}" if ext else f"documents/{unique_name}"

            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=self._content_type(filename),
            )

            return key

        except Exception as err:
            print("S3 upload error:", err)
            return None

    # ----------------------------------------------------

    def get_file_url(self, file_key: str) -> str:
        """
        Returns file URL based on environment
        """

        if not self.use_s3:
            return f"/local/files/{file_key}"

        try:
            return self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": file_key,
                },
                ExpiresIn=3600,
            )
        except Exception:
            return ""

    # ----------------------------------------------------

    def _content_type(self, filename: str) -> str:
        ext = filename.split(".")[-1].lower() if "." in filename else ""

        if ext == "pdf":
            return "application/pdf"
        if ext == "txt":
            return "text/plain"
        if ext in ("jpg", "jpeg"):
            return "image/jpeg"
        if ext == "png":
            return "image/png"
        if ext == "doc":
            return "application/msword"
        if ext == "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        return "application/octet-stream"


# Use everywhere
s3_service = S3Service()
