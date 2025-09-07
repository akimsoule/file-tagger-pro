import { BackupService } from "../services/backupService";
import { DocumentService } from "../services/documentService";
import { LogService } from "../services/logService";
import { MegaStorageService } from "../services/megaStorage";
import { SearchService } from "../services/searchService";
import { StatsService } from "../services/statsService";
import { TagService } from "../services/tagService";
import { UserService } from "../services/userService";
import { UtilsService } from "../services/utilsService";

const logService = new LogService();
const megaStorageService = new MegaStorageService();
const userService = new UserService(logService);
const documentService = new DocumentService(megaStorageService, logService);
const tagService = new TagService(logService);
const searchService = new SearchService(logService);
const statsService = new StatsService(logService);
const backupService = new BackupService(logService, megaStorageService);
const utilsService = new UtilsService(logService);

export {
  backupService,
  documentService,
  logService,
  megaStorageService,
  searchService,
  statsService,
  tagService,
  userService,
  utilsService,
};
