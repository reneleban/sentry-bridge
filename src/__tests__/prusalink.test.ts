import { createPrusaLinkClient, HttpFetcher } from "../prusalink/client";
import { PrusaLinkConfig } from "../prusalink/types";

const config: PrusaLinkConfig = {
  baseUrl: "http://prusa.local",
  username: "maker",
  password: "secret",
};

const mockFetch = jest.fn();
const fetcher: HttpFetcher = { fetch: mockFetch };

beforeEach(() => {
  jest.clearAllMocks();
});

function mockResponse(status: number, body?: object): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body ?? {}),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ""),
  } as unknown as Response;
}

const statusBody = {
  printer: {
    state: "IDLE",
    temp_bed: 25.2,
    target_bed: 0.0,
    temp_nozzle: 26.5,
    target_nozzle: 0.0,
    axis_z: 0.0,
    axis_x: 252.0,
    axis_y: -19.0,
    flow: 100,
    speed: 100,
    fan_hotend: 0,
    fan_print: 0,
  },
};

const jobBody = {
  id: 420,
  state: "PRINTING",
  progress: 42.5,
  time_printing: 1800,
  time_remaining: 2400,
  file: {
    name: "benchy.gcode",
    display_name: "benchy_0.2mm_PETG.gcode",
  },
};

describe("PrusaLinkClient", () => {
  describe("testConnection()", () => {
    it("returns ok:true on 200", async () => {
      mockFetch.mockResolvedValue(mockResponse(200, { hostname: "prusa" }));
      const client = createPrusaLinkClient(config, fetcher);
      const result = await client.testConnection();
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://prusa.local/api/v1/info",
        expect.anything()
      );
    });

    it("returns ok:false on 401", async () => {
      mockFetch.mockResolvedValue(mockResponse(401));
      const client = createPrusaLinkClient(config, fetcher);
      const result = await client.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/auth/i);
    });

    it("returns ok:false on network error", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
      const client = createPrusaLinkClient(config, fetcher);
      const result = await client.testConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("ECONNREFUSED");
    });
  });

  describe("getStatus()", () => {
    it("maps PrusaLink response to internal model", async () => {
      mockFetch.mockResolvedValue(mockResponse(200, statusBody));
      const client = createPrusaLinkClient(config, fetcher);
      const status = await client.getStatus();
      expect(status.state).toBe("IDLE");
      expect(status.tempBed).toBe(25.2);
      expect(status.tempNozzle).toBe(26.5);
      expect(status.axisX).toBe(252.0);
      expect(status.flow).toBe(100);
      expect(status.fanPrint).toBe(0);
    });

    it("throws on non-200 response", async () => {
      mockFetch.mockResolvedValue(mockResponse(500));
      const client = createPrusaLinkClient(config, fetcher);
      await expect(client.getStatus()).rejects.toThrow();
    });
  });

  describe("getJob()", () => {
    it("returns null when printer is idle (204)", async () => {
      mockFetch.mockResolvedValue(mockResponse(204));
      const client = createPrusaLinkClient(config, fetcher);
      const job = await client.getJob();
      expect(job).toBeNull();
    });

    it("returns job info when printing", async () => {
      mockFetch.mockResolvedValue(mockResponse(200, jobBody));
      const client = createPrusaLinkClient(config, fetcher);
      const job = await client.getJob();
      expect(job).not.toBeNull();
      expect(job!.id).toBe(420);
      expect(job!.progress).toBe(42.5);
      expect(job!.fileName).toBe("benchy.gcode");
      expect(job!.displayName).toBe("benchy_0.2mm_PETG.gcode");
      expect(job!.timePrinting).toBe(1800);
      expect(job!.timeRemaining).toBe(2400);
    });
  });

  describe("pause()", () => {
    it("fetches job ID then sends PUT pause", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(200, jobBody))
        .mockResolvedValueOnce(mockResponse(204));
      const client = createPrusaLinkClient(config, fetcher);
      await client.pause();
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "http://prusa.local/api/v1/job",
        expect.anything()
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://prusa.local/api/v1/job/420/pause",
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("throws when no active job", async () => {
      mockFetch.mockResolvedValue(mockResponse(204));
      const client = createPrusaLinkClient(config, fetcher);
      await expect(client.pause()).rejects.toThrow(/no active job/i);
    });

    it("throws on 409 conflict", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(200, jobBody))
        .mockResolvedValueOnce(mockResponse(409));
      const client = createPrusaLinkClient(config, fetcher);
      await expect(client.pause()).rejects.toThrow(/conflict/i);
    });
  });

  describe("resume()", () => {
    it("fetches job ID then sends PUT resume", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(200, jobBody))
        .mockResolvedValueOnce(mockResponse(204));
      const client = createPrusaLinkClient(config, fetcher);
      await client.resume();
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://prusa.local/api/v1/job/420/resume",
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("throws on 409 conflict", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(200, jobBody))
        .mockResolvedValueOnce(mockResponse(409));
      const client = createPrusaLinkClient(config, fetcher);
      await expect(client.resume()).rejects.toThrow(/conflict/i);
    });
  });

  describe("cancel()", () => {
    it("fetches job ID then sends DELETE", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(200, jobBody))
        .mockResolvedValueOnce(mockResponse(204));
      const client = createPrusaLinkClient(config, fetcher);
      await client.cancel();
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://prusa.local/api/v1/job/420",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("throws on 409 conflict", async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse(200, jobBody))
        .mockResolvedValueOnce(mockResponse(409));
      const client = createPrusaLinkClient(config, fetcher);
      await expect(client.cancel()).rejects.toThrow(/conflict/i);
    });
  });
});
