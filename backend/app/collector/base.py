import abc
from app.models import ServerModel, SystemMetrics

class BaseCollector(abc.ABC):
    def __init__(self, server: ServerModel):
        self.server = server

    @abc.abstractmethod
    async def collect(self) -> SystemMetrics:
        """Collect metrics from target server"""
        pass

    @abc.abstractmethod
    async def test_connection(self) -> tuple[bool, str]:
        """Test connection to the target server"""
        pass
