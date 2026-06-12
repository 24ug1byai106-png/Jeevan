import logging.config

from app.config.settings import Settings


def configure_logging(settings: Settings) -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
                },
                "access": {
                    "format": "%(asctime)s %(levelname)s %(method)s %(path)s %(status_code)s %(duration_ms).2fms",
                },
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                },
                "access": {
                    "class": "logging.StreamHandler",
                    "formatter": "access",
                },
            },
            "loggers": {
                "app": {"handlers": ["default"], "level": settings.log_level, "propagate": False},
                "app.access": {"handlers": ["access"], "level": settings.log_level, "propagate": False},
                "uvicorn.access": {"handlers": ["default"], "level": "WARNING", "propagate": False},
            },
            "root": {"handlers": ["default"], "level": settings.log_level},
        }
    )
