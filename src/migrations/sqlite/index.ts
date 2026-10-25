import * as migration_20260910_161003_initial from './20260910_161003_initial';
import * as migration_20260911_142929_media_seo_blog from './20260911_142929_media_seo_blog';
import * as migration_20260917_134307_production_project_fields from './20260917_134307_production_project_fields';
import * as migration_20261025_010959_dashboard_api_key from './20261025_010959_dashboard_api_key';

export const migrations = [
  {
    up: migration_20260910_161003_initial.up,
    down: migration_20260910_161003_initial.down,
    name: '20260910_161003_initial',
  },
  {
    up: migration_20260911_142929_media_seo_blog.up,
    down: migration_20260911_142929_media_seo_blog.down,
    name: '20260911_142929_media_seo_blog',
  },
  {
    up: migration_20260917_134307_production_project_fields.up,
    down: migration_20260917_134307_production_project_fields.down,
    name: '20260917_134307_production_project_fields',
  },
  {
    up: migration_20261025_010959_dashboard_api_key.up,
    down: migration_20261025_010959_dashboard_api_key.down,
    name: '20261025_010959_dashboard_api_key'
  },
];
